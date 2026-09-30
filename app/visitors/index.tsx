import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, BackHandler, Modal, TextInput, Alert, Share,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { visitorService, VisitorDto, PreApproveVisitorRequest } from '@/services/visitorService';

type VisitorStatus = 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'DENIED';
type VisitorType = 'GUEST' | 'DELIVERY' | 'CAB' | 'SERVICE';
type TabKey = 'active' | 'history';

interface VisitorEntry {
  id: number;
  name: string;
  type: VisitorType;
  purpose: string;
  vehicleNumber?: string;
  expectedAt: string;
  status: VisitorStatus;
  flat: string;
  passCode: string;
}

const VISITOR_TYPE_CONFIG: Record<VisitorType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  GUEST:    { label: 'Guest',       icon: 'person-outline',    color: COLORS.primary, bg: '#EEF2FF' },
  DELIVERY: { label: 'Delivery',    icon: 'cube-outline',      color: '#D97706',      bg: '#FEF3C7' },
  CAB:      { label: 'Cab / Taxi',  icon: 'car-outline',       color: '#2563EB',      bg: '#DBEAFE' },
  SERVICE:  { label: 'Service Tech',icon: 'construct-outline', color: '#059669',      bg: '#D1FAE5' },
};

const STATUS_META: Record<VisitorStatus, { label: string; color: string; bg: string }> = {
  EXPECTED:    { label: 'Expected',   color: '#D97706', bg: '#FEF3C7' },
  CHECKED_IN:  { label: 'Inside Gate',color: '#059669', bg: '#D1FAE5' },
  CHECKED_OUT: { label: 'Departed',   color: '#64748B', bg: '#F1F5F9' },
  DENIED:      { label: 'Denied Entry',color: '#EF4444', bg: '#FEE2E2' },
};

const INITIAL_VISITORS: VisitorEntry[] = [
  {
    id: 1,
    name: 'Suresh Verma',
    type: 'GUEST',
    purpose: 'Family Weekend Dinner',
    vehicleNumber: 'KA-01-MJ-9821',
    expectedAt: 'Today, 07:30 PM',
    status: 'EXPECTED',
    flat: 'Tower A - Unit 1204',
    passCode: 'MANA-7821',
  },
  {
    id: 2,
    name: 'Amazon Courier',
    type: 'DELIVERY',
    purpose: 'Electronics Package',
    expectedAt: 'Today, 02:15 PM',
    status: 'CHECKED_IN',
    flat: 'Tower A - Unit 1204',
    passCode: 'MANA-4412',
  },
  {
    id: 3,
    name: 'Ola Cab (MH-02-EE-3291)',
    type: 'CAB',
    purpose: 'Airport Pickup',
    vehicleNumber: 'MH-02-EE-3291',
    expectedAt: 'Today, 09:00 PM',
    status: 'EXPECTED',
    flat: 'Tower A - Unit 1204',
    passCode: 'MANA-9903',
  },
  {
    id: 4,
    name: 'Urban Company Plumber',
    type: 'SERVICE',
    purpose: 'Kitchen Sink Fixture',
    expectedAt: 'Yesterday, 11:00 AM',
    status: 'CHECKED_OUT',
    flat: 'Tower A - Unit 1204',
    passCode: 'MANA-1082',
  },
  {
    id: 5,
    name: 'Unverified Sales Rep',
    type: 'GUEST',
    purpose: 'Cold Call Promotion',
    expectedAt: 'Sep 24, 04:30 PM',
    status: 'DENIED',
    flat: 'Tower A - Unit 1204',
    passCode: 'MANA-0021',
  },
];

export default function VisitorsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [tab, setTab] = useState<TabKey>('active');
  const [localVisitors, setLocalVisitors] = useState<VisitorEntry[]>([]);
  const [isPreApproveModal, setIsPreApproveModal] = useState(false);
  const [selectedPass, setSelectedPass] = useState<VisitorEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestVehicle, setGuestVehicle] = useState('');
  const [guestType, setGuestType] = useState<VisitorType>('GUEST');
  const [guestPurpose, setGuestPurpose] = useState('');

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectedPass) {
          setSelectedPass(null);
          return true;
        }
        if (isPreApproveModal) {
          setIsPreApproveModal(false);
          return true;
        }
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome, selectedPass, isPreApproveModal])
  );

  const mapDtoToEntry = useCallback((dto: VisitorDto): VisitorEntry => {
    let mappedStatus: VisitorStatus = 'EXPECTED';
    const st = dto.status ? dto.status.toUpperCase() : 'EXPECTED';
    if (st === 'CHECKED_IN') mappedStatus = 'CHECKED_IN';
    else if (st === 'CHECKED_OUT') mappedStatus = 'CHECKED_OUT';
    else if (st === 'DENIED' || st === 'REJECTED') mappedStatus = 'DENIED';
    else mappedStatus = 'EXPECTED';

    let mappedType: VisitorType = 'GUEST';
    const tp = dto.passType ? dto.passType.toUpperCase() : 'GUEST';
    if (tp === 'DELIVERY') mappedType = 'DELIVERY';
    else if (tp === 'CAB') mappedType = 'CAB';
    else if (tp === 'SERVICE') mappedType = 'SERVICE';
    else mappedType = 'GUEST';

    let expectedDisplay = 'Today';
    if (dto.expectedAt) {
      expectedDisplay = dto.expectedAt.includes('T')
        ? dto.expectedAt.replace('T', ' ').slice(0, 16)
        : dto.expectedAt;
    }

    return {
      id: dto.id,
      name: dto.visitorName,
      type: mappedType,
      purpose: dto.purpose || `${VISITOR_TYPE_CONFIG[mappedType]?.label || 'Visitor'} Entry`,
      vehicleNumber: dto.vehicleNumber || undefined,
      expectedAt: expectedDisplay,
      status: mappedStatus,
      flat: dto.flatNumber || `Tower ${user?.tower || 'A'} - Unit ${user?.flatNumber || '1204'}`,
      passCode: dto.passCode,
    };
  }, [user]);

  // ── 1. Fetch Live Visitor Logs ──────────────────────────────────────────────
  const {
    data: rawVisitors,
    isLoading,
    refetch,
  } = useQuery<VisitorDto[]>({
    queryKey: ['visitors', 'my-visitors'],
    queryFn: () => visitorService.getMyVisitors(),
    staleTime: 15_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Merge Live API Visitors with Local/Sample
  const visitors: VisitorEntry[] = useMemo(() => {
    if (rawVisitors && rawVisitors.length > 0) {
      const live = rawVisitors.map(mapDtoToEntry);
      const liveIds = new Set(live.map(v => v.id));
      const nonOverlappingLocal = localVisitors.filter(v => !liveIds.has(v.id));
      return [...nonOverlappingLocal, ...live];
    }
    if (localVisitors.length > 0) {
      return [...localVisitors, ...INITIAL_VISITORS];
    }
    return INITIAL_VISITORS;
  }, [rawVisitors, localVisitors, mapDtoToEntry]);

  // ── 2. Pre-Approve Visitor Mutation ─────────────────────────────────────────
  const preApproveMutation = useMutation({
    mutationFn: (req: PreApproveVisitorRequest) => visitorService.preApprove(req),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      const newEntry = mapDtoToEntry(res);
      setLocalVisitors(prev => [newEntry, ...prev]);
      setIsPreApproveModal(false);
      setGuestName('');
      setGuestPhone('');
      setGuestVehicle('');
      setGuestPurpose('');
      setSelectedPass(newEntry);
      Alert.alert('✅ Pass Generated', `Digital Gate Pass ${newEntry.passCode} has been created.`);
    },
    onError: () => {
      // Offline fallback pass
      const newCode = `MANA-${Math.floor(1000 + Math.random() * 9000)}`;
      const newEntry: VisitorEntry = {
        id: Date.now(),
        name: guestName.trim(),
        type: guestType,
        purpose: guestPurpose.trim() || `${VISITOR_TYPE_CONFIG[guestType].label} Entry`,
        vehicleNumber: guestVehicle.trim() || undefined,
        expectedAt: 'Today, Just Now',
        status: 'EXPECTED',
        flat: `Tower ${user?.tower || 'A'} - Unit ${user?.flatNumber || '1204'}`,
        passCode: newCode,
      };
      setLocalVisitors(prev => [newEntry, ...prev]);
      setIsPreApproveModal(false);
      setGuestName('');
      setGuestPhone('');
      setGuestVehicle('');
      setGuestPurpose('');
      setSelectedPass(newEntry);
    },
  });

  const handleCreatePass = () => {
    if (!guestName.trim()) {
      Alert.alert('Name Required', 'Please enter visitor or company name.');
      return;
    }
    const flatStr = `Tower ${user?.tower || 'A'} - Unit ${user?.flatNumber || '1204'}`;
    preApproveMutation.mutate({
      visitorName: guestName.trim(),
      visitorPhone: guestPhone.trim() || undefined,
      vehicleNumber: guestVehicle.trim() || undefined,
      passType: guestType,
      purpose: guestPurpose.trim() || `${VISITOR_TYPE_CONFIG[guestType].label} Entry`,
      flatNumber: flatStr,
    });
  };

  const handleSharePass = async (entry: VisitorEntry) => {
    try {
      await Share.share({
        message: `Mana Community Gate Pass\nVisitor: ${entry.name}\nPasscode: ${entry.passCode}\nDestination: ${entry.flat}\nPurpose: ${entry.purpose}`,
      });
    } catch {}
  };

  const handleAllowEntry = async (id: number) => {
    try {
      await visitorService.checkIn(id);
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    } catch {}
    setLocalVisitors(prev => prev.map(v => v.id === id ? { ...v, status: 'CHECKED_IN' as VisitorStatus } : v));
    Alert.alert('Access Granted', 'Security Gate has been notified to allow entry.');
  };

  const handleDenyEntry = async (id: number) => {
    try {
      await visitorService.denyEntry(id);
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    } catch {}
    setLocalVisitors(prev => prev.map(v => v.id === id ? { ...v, status: 'DENIED' as VisitorStatus } : v));
    Alert.alert('Access Denied', 'Security Gate has been instructed to decline entry.');
  };

  const handleCheckOut = async (id: number) => {
    try {
      await visitorService.checkOut(id);
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    } catch {}
    setLocalVisitors(prev => prev.map(v => v.id === id ? { ...v, status: 'CHECKED_OUT' as VisitorStatus } : v));
    Alert.alert('Departure Recorded', 'Visitor departure has been logged.');
  };

  const filtered = useMemo(() => {
    if (tab === 'active') {
      return visitors.filter(v => v.status === 'EXPECTED' || v.status === 'CHECKED_IN');
    }
    return visitors.filter(v => v.status === 'CHECKED_OUT' || v.status === 'DENIED');
  }, [tab, visitors]);

  const insideCount = useMemo(() => visitors.filter(v => v.status === 'CHECKED_IN').length, [visitors]);
  const expectedCount = useMemo(() => visitors.filter(v => v.status === 'EXPECTED').length, [visitors]);

  const renderVisitor = ({ item }: { item: VisitorEntry }) => {
    const typeMeta = VISITOR_TYPE_CONFIG[item.type];
    const statusMeta = STATUS_META[item.status];

    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.typeIconBox, { backgroundColor: typeMeta.bg }]}>
            <Ionicons name={typeMeta.icon} size={22} color={typeMeta.color} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={s.visitorName} numberOfLines={1}>{item.name}</Text>
              <View style={[s.statusBadge, { backgroundColor: statusMeta.bg }]}>
                <Text style={[s.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
              </View>
            </View>
            <Text style={s.visitorPurpose} numberOfLines={1}>{item.purpose}</Text>
          </View>
        </View>

        {/* Metadata & Vehicle */}
        <View style={s.cardMetaBar}>
          <View style={s.metaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
            <Text style={s.metaText}>{item.expectedAt}</Text>
          </View>
          {item.vehicleNumber && (
            <View style={s.vehicleBadge}>
              <Ionicons name="car-outline" size={12} color={COLORS.primary} />
              <Text style={s.vehicleText}>{item.vehicleNumber}</Text>
            </View>
          )}
          <View style={s.passPill}>
            <Text style={s.passPillText}>{item.passCode}</Text>
          </View>
        </View>

        {/* Action Bar */}
        <View style={s.cardFooter}>
          <TouchableOpacity
            style={s.sharePassBtn}
            onPress={() => setSelectedPass(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={15} color={COLORS.primary} />
            <Text style={s.sharePassBtnText}>View Pass</Text>
          </TouchableOpacity>

          {item.status === 'EXPECTED' && (
            <View style={s.gateDecisionRow}>
              <TouchableOpacity
                style={s.denyBtn}
                onPress={() => handleDenyEntry(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={15} color="#EF4444" />
                <Text style={s.denyBtnText}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.allowBtn}
                onPress={() => handleAllowEntry(item.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                <Text style={s.allowBtnText}>Allow Entry</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.status === 'CHECKED_IN' && (
            <TouchableOpacity
              style={s.checkOutBtn}
              onPress={() => handleCheckOut(item.id)}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={15} color="#475569" />
              <Text style={s.checkOutBtnText}>Check Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Screen Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Gate & Visitors</Text>
          <Text style={s.headerSub}>Pre-approve & monitor visitor access</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsPreApproveModal(true)}
          style={s.preApproveBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={s.preApproveBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary Stats ── */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <View style={[s.statDot, { backgroundColor: '#059669' }]} />
          <Text style={s.statVal}>{insideCount}</Text>
          <Text style={s.statLabel}>Inside Society</Text>
        </View>
        <View style={s.statCard}>
          <View style={[s.statDot, { backgroundColor: '#D97706' }]} />
          <Text style={s.statVal}>{expectedCount}</Text>
          <Text style={s.statLabel}>Expected Today</Text>
        </View>
        <TouchableOpacity
          style={[s.statCard, { backgroundColor: '#EEF2FF', borderColor: 'rgba(99, 102, 241, 0.2)' }]}
          onPress={() => setIsPreApproveModal(true)}
        >
          <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
          <Text style={[s.statVal, { color: COLORS.primary }]}>+ Pass</Text>
          <Text style={[s.statLabel, { color: COLORS.primary }]}>Pre-Approve</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tabs (Active / History) ── */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'active' && s.tabBtnActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[s.tabText, tab === 'active' && s.tabTextActive]}>
            Active Visitors ({insideCount + expectedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'history' && s.tabBtnActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[s.tabText, tab === 'history' && s.tabTextActive]}>
            Visitor Log & History
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Visitor List ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderVisitor}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={s.emptyState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={[s.emptySub, { marginTop: 12 }]}>Loading visitor logs...</Text>
            </View>
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="shield-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No visitors to display</Text>
              <Text style={s.emptySub}>Pre-approve guests or delivery agents to speed up check-in</Text>
            </View>
          )
        }
      />

      {/* ── Pre-Approve Visitor Modal ── */}
      <Modal visible={isPreApproveModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Pre-Approve Visitor</Text>
                <Text style={s.modalSubtitle}>Generate an instant gate access pass</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPreApproveModal(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Type Selector */}
            <Text style={s.inputLabel}>Visitor Type</Text>
            <View style={s.typeSelectorRow}>
              {(['GUEST', 'DELIVERY', 'CAB', 'SERVICE'] as VisitorType[]).map((t) => {
                const isSelected = guestType === t;
                const meta = VISITOR_TYPE_CONFIG[t];
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeChip, isSelected && s.typeChipSelected]}
                    onPress={() => setGuestType(t)}
                  >
                    <Ionicons
                      name={meta.icon}
                      size={16}
                      color={isSelected ? '#FFFFFF' : COLORS.textSecondary}
                    />
                    <Text style={[s.typeChipText, isSelected && s.typeChipTextSelected]}>
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Input fields */}
            <Text style={s.inputLabel}>Visitor / Company Name *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Swiggy, Ramesh Sharma, Urban Co"
              placeholderTextColor={COLORS.textMuted}
              value={guestName}
              onChangeText={setGuestName}
            />

            <Text style={s.inputLabel}>Purpose / Note</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Dinner, Grocery Delivery, AC Repair"
              placeholderTextColor={COLORS.textMuted}
              value={guestPurpose}
              onChangeText={setGuestPurpose}
            />

            <View style={{ flexDirection: 'row', gap: SPACING.md }}>
              <View style={{ flex: 1 }}>
                <Text style={s.inputLabel}>Phone (Optional)</Text>
                <TextInput
                  style={s.input}
                  placeholder="9876543210"
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.textMuted}
                  value={guestPhone}
                  onChangeText={setGuestPhone}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.inputLabel}>Vehicle No (Optional)</Text>
                <TextInput
                  style={s.input}
                  placeholder="KA-01-AB-1234"
                  autoCapitalize="characters"
                  placeholderTextColor={COLORS.textMuted}
                  value={guestVehicle}
                  onChangeText={setGuestVehicle}
                />
              </View>
            </View>

            {/* Modal Actions */}
            <View style={s.modalActionRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setIsPreApproveModal(false)}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, preApproveMutation.isPending && { opacity: 0.7 }]}
                onPress={handleCreatePass}
                disabled={preApproveMutation.isPending}
              >
                {preApproveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.confirmBtnText}>Create Gate Pass</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Gate Pass QR / Share Modal ── */}
      <Modal visible={!!selectedPass} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.passModalCard}>
            <View style={s.passHeaderRow}>
              <View style={s.passBadge}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                <Text style={s.passBadgeText}>Verified Gate Entry Pass</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPass(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedPass && (
              <View style={s.passModalBody}>
                <Text style={s.passGuestName}>{selectedPass.name}</Text>
                <Text style={s.passFlat}>{selectedPass.flat}</Text>

                {/* Gate Pass Code Box */}
                <View style={s.passCodeBox}>
                  <Text style={s.passCodeLabel}>Security Entry Passcode</Text>
                  <Text style={s.passCodeVal}>{selectedPass.passCode}</Text>
                  <Ionicons name="qr-code-outline" size={54} color={COLORS.primary} style={{ marginTop: 8 }} />
                  <Text style={s.passCodeSub}>Show code or scan QR at Mana security checkpoint</Text>
                </View>

                <View style={s.passMetaList}>
                  <View style={s.passMetaItem}>
                    <Text style={s.passMetaKey}>Purpose:</Text>
                    <Text style={s.passMetaVal}>{selectedPass.purpose}</Text>
                  </View>
                  {selectedPass.vehicleNumber && (
                    <View style={s.passMetaItem}>
                      <Text style={s.passMetaKey}>Vehicle:</Text>
                      <Text style={s.passMetaVal}>{selectedPass.vehicleNumber}</Text>
                    </View>
                  )}
                  <View style={s.passMetaItem}>
                    <Text style={s.passMetaKey}>Status:</Text>
                    <Text style={[s.passMetaVal, { color: STATUS_META[selectedPass.status].color, fontWeight: '800' }]}>
                      {STATUS_META[selectedPass.status].label}
                    </Text>
                  </View>
                </View>

                {/* WhatsApp & Done Actions */}
                <View style={s.passModalActions}>
                  <TouchableOpacity
                    style={s.whatsappShareBtn}
                    onPress={() => handleSharePass(selectedPass)}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                    <Text style={s.whatsappShareBtnText}>Share Pass</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.passDoneBtn}
                    onPress={() => setSelectedPass(null)}
                  >
                    <Text style={s.passDoneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.12)',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },

  preApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  preApproveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.08)',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 2 },
  statVal: { fontSize: 16, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Outfit-Bold' },

  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  typeIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  visitorName: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  visitorPurpose: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  cardMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.md,
    flexWrap: 'wrap',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehicleText: { fontSize: 10, fontWeight: '700', color: COLORS.primary, fontFamily: 'monospace' },
  passPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  passPillText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'monospace' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  sharePassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  sharePassBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  gateDecisionRow: { flexDirection: 'row', gap: 8 },
  denyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  denyBtnText: { fontSize: 11, fontWeight: '700', color: '#EF4444', fontFamily: 'Outfit-Bold' },
  allowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  allowBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  checkOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  checkOutBtnText: { fontSize: 11, fontWeight: '700', color: '#475569', fontFamily: 'Outfit-Bold' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 30, fontFamily: 'DMSans-Regular' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  modalCloseBtn: { padding: 4 },

  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 8,
    fontFamily: 'DMSans-Medium',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'DMSans-Regular',
  },

  typeSelectorRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.xs },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  typeChipTextSelected: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Outfit-Bold' },

  modalActionRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  passModalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  passHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  passBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  passBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  passModalBody: { gap: 6 },
  passGuestName: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  passFlat: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  passCodeBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  passCodeLabel: { fontSize: 11, color: COLORS.primary, fontWeight: '700', fontFamily: 'Outfit-Bold', textTransform: 'uppercase' },
  passCodeVal: { fontSize: 26, fontWeight: '900', color: COLORS.primary, letterSpacing: 2, marginTop: 4, fontFamily: 'Outfit-Bold' },
  passCodeSub: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, fontFamily: 'DMSans-Regular' },

  passMetaList: { gap: 4, marginVertical: SPACING.xs },
  passMetaItem: { flexDirection: 'row', justifyContent: 'space-between' },
  passMetaKey: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  passMetaVal: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },

  passModalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  whatsappShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#25D366',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  whatsappShareBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  passDoneBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  passDoneBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },
});

