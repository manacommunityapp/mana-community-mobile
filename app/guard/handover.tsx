import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Modal, TextInput, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  shiftHandoverService,
  ShiftHandover,
  ShiftType,
  HandoverItem,
  CreateHandoverRequest,
} from '@/services/shiftHandoverService';

const ACCENT = '#D97706';

const SHIFT_META: Record<ShiftType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; time: string }> = {
  MORNING:   { label: 'Morning',   icon: 'sunny-outline',     color: '#D97706', bg: '#FEF3C7', time: '06:00 – 14:00' },
  AFTERNOON: { label: 'Afternoon', icon: 'partly-sunny-outline', color: '#2563EB', bg: '#DBEAFE', time: '14:00 – 22:00' },
  NIGHT:     { label: 'Night',     icon: 'moon-outline',      color: '#7C3AED', bg: '#EDE9FE', time: '22:00 – 06:00' },
};

const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  VISITOR:     { icon: 'person-outline',    label: 'Visitor'     },
  VEHICLE:     { icon: 'car-outline',       label: 'Vehicle'     },
  INCIDENT:    { icon: 'warning-outline',   label: 'Incident'    },
  MAINTENANCE: { icon: 'construct-outline', label: 'Maintenance' },
  OTHER:       { icon: 'ellipsis-horizontal-outline', label: 'Other' },
};

const PRIORITY_META = {
  HIGH:   { color: '#DC2626', bg: '#FEE2E2', label: 'High'   },
  MEDIUM: { color: '#D97706', bg: '#FEF3C7', label: 'Medium' },
  LOW:    { color: '#059669', bg: '#D1FAE5', label: 'Low'    },
};

const TODAY = new Date().toISOString().split('T')[0];

const MOCK_TODAY: ShiftHandover[] = [
  {
    id: 1,
    shiftType: 'MORNING',
    date: TODAY,
    outgoingGuardName: 'Ramesh Kumar',
    incomingGuardName: 'Suresh Yadav',
    handoverTime: '14:00',
    status: 'ACKNOWLEDGED',
    acknowledgedAt: new Date().toISOString(),
    notes: 'All clear. Parking B light bulb needs replacement.',
    items: [
      { id: 1, category: 'VISITOR', description: 'Visitor in Flat 1204 Tower A expected until 16:00', resolvedBefore: false, priority: 'MEDIUM' },
      { id: 2, category: 'MAINTENANCE', description: 'Parking B light bulb flickering', resolvedBefore: false, priority: 'LOW' },
    ],
  },
  {
    id: 2,
    shiftType: 'AFTERNOON',
    date: TODAY,
    outgoingGuardName: 'Suresh Yadav',
    handoverTime: '22:00',
    status: 'PENDING',
    items: [
      { id: 3, category: 'INCIDENT', description: 'Suspicious vehicle KA-04-XX-1234 circled compound twice at 19:30', resolvedBefore: false, priority: 'HIGH' },
      { id: 4, category: 'VISITOR', description: 'Delivery pending collection at gate — Flat 308 Tower B', resolvedBefore: false, priority: 'MEDIUM' },
      { id: 5, category: 'MAINTENANCE', description: 'Main gate camera offline since 18:00, reported to IT', resolvedBefore: false, priority: 'HIGH' },
    ],
  },
];

const MOCK_HISTORY: ShiftHandover[] = [
  { id: 10, shiftType: 'NIGHT', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], outgoingGuardName: 'Mohan Lal', handoverTime: '06:00', status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString(), items: [{ id: 10, category: 'OTHER', description: 'Quiet night, no incidents', resolvedBefore: true, priority: 'LOW' }] },
  { id: 11, shiftType: 'MORNING', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], outgoingGuardName: 'Ramesh Kumar', handoverTime: '14:00', status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString(), items: [{ id: 11, category: 'VISITOR', description: 'Package left at gate for Flat 502 Tower A', resolvedBefore: true, priority: 'LOW' }] },
];

type NewItem = Omit<HandoverItem, 'id'>;

const BLANK_ITEM: NewItem = { category: 'OTHER', description: '', resolvedBefore: false, priority: 'MEDIUM' };

export default function GuardHandoverScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newShift, setNewShift] = useState<ShiftType>('AFTERNOON');
  const [newItems, setNewItems] = useState<NewItem[]>([{ ...BLANK_ITEM }]);
  const [newNotes, setNewNotes] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [ackSuccessId, setAckSuccessId] = useState<number | null>(null);
  const [ackErr, setAckErr] = useState('');

  const { data: rawToday, isLoading: loadingToday } = useQuery<ShiftHandover[]>({
    queryKey: ['guard', 'handovers', 'today'],
    queryFn: () => shiftHandoverService.getTodayHandovers(),
    staleTime: 30_000,
  });
  const todayHandovers = rawToday && rawToday.length > 0 ? rawToday : MOCK_TODAY;

  const { data: rawHistory, isLoading: loadingHistory } = useQuery<ShiftHandover[]>({
    queryKey: ['guard', 'handovers', 'history'],
    queryFn: () => shiftHandoverService.getHandoverHistory(20),
    staleTime: 60_000,
  });
  const history = rawHistory && rawHistory.length > 0 ? rawHistory : MOCK_HISTORY;

  const createMutation = useMutation({
    mutationFn: (data: CreateHandoverRequest) => shiftHandoverService.createHandover(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard', 'handovers'] });
      setShowCreate(false);
      setNewItems([{ ...BLANK_ITEM }]);
      setNewNotes('');
      setCreateErr('');
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3500);
    },
    onError: (err: any) => setCreateErr(err?.message || 'Failed to create handover. Please try again.'),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: number) => shiftHandoverService.acknowledgeHandover(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['guard', 'handovers'] });
      setAckSuccessId(id);
      setAckErr('');
      setTimeout(() => setAckSuccessId(null), 3000);
    },
    onError: (err: any) => setAckErr(err?.message || 'Could not acknowledge handover.'),
  });

  const handleCreate = () => {
    const validItems = newItems.filter(i => i.description.trim());
    if (validItems.length === 0) { setCreateErr('Add at least one handover item with a description.'); return; }
    setCreateErr('');
    createMutation.mutate({ shiftType: newShift, items: validItems, notes: newNotes.trim() || undefined });
  };

  const updateItem = (idx: number, patch: Partial<NewItem>) =>
    setNewItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const renderHandover = (item: ShiftHandover, showAck = true) => {
    const shift = SHIFT_META[item.shiftType];
    const expanded = expandedId === item.id;
    const pending = item.status === 'PENDING';

    return (
      <View key={item.id} style={[s.card, pending && s.cardPending]}>
        {pending && showAck && (
          <View style={s.pendingBanner}>
            <Ionicons name="time-outline" size={13} color="#92400E" />
            <Text style={s.pendingBannerText}>Incoming shift — please acknowledge this handover</Text>
          </View>
        )}
        <TouchableOpacity style={s.cardHeader} onPress={() => setExpandedId(expanded ? null : item.id)} activeOpacity={0.8}>
          <View style={[s.shiftPill, { backgroundColor: shift.bg }]}>
            <Ionicons name={shift.icon} size={14} color={shift.color} />
            <Text style={[s.shiftPillText, { color: shift.color }]}>{shift.label}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.guardName}>{item.outgoingGuardName}</Text>
            <Text style={s.handoverTime}>Handover at {item.handoverTime} · {item.items.length} items</Text>
          </View>
          <View style={[s.statusChip, { backgroundColor: pending ? '#FEF3C7' : '#D1FAE5' }]}>
            <Text style={[s.statusChipText, { color: pending ? '#92400E' : '#065F46' }]}>
              {pending ? 'Pending' : 'Acknowledged'}
            </Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {expanded && (
          <View style={s.itemsList}>
            {item.items.map(it => {
              const cat = CATEGORY_META[it.category] ?? CATEGORY_META.OTHER;
              const pri = PRIORITY_META[it.priority];
              return (
                <View key={it.id} style={s.itemRow}>
                  <View style={s.itemIcon}>
                    <Ionicons name={cat.icon} size={14} color={ACCENT} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={s.itemDesc}>{it.description}</Text>
                    <View style={s.itemMeta}>
                      <View style={[s.priChip, { backgroundColor: pri.bg }]}>
                        <Text style={[s.priChipText, { color: pri.color }]}>{pri.label}</Text>
                      </View>
                      <Text style={s.catLabel}>{cat.label}</Text>
                      {it.resolvedBefore && (
                        <View style={s.resolvedChip}><Text style={s.resolvedText}>Resolved</Text></View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
            {item.notes && (
              <View style={s.notesBox}>
                <Text style={s.notesLabel}>Notes</Text>
                <Text style={s.notesText}>{item.notes}</Text>
              </View>
            )}
            {pending && showAck && (
              ackSuccessId === item.id ? (
                <View style={s.ackSuccess}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={s.ackSuccessText}>Acknowledged — you have taken over the shift</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.ackBtn, acknowledgeMutation.isPending && { opacity: 0.7 }]}
                  onPress={() => acknowledgeMutation.mutate(item.id)}
                  disabled={acknowledgeMutation.isPending}
                >
                  {acknowledgeMutation.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                        <Text style={s.ackBtnText}>Acknowledge Handover</Text>
                      </>
                  }
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Shift Handover</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={s.createBtn}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.createBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabBar}>
        {(['today', 'history'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tabItem, activeTab === tab && s.tabItemActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>
              {tab === 'today' ? "Today's Handovers" : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {createSuccess && (
        <View style={s.successBanner}>
          <Ionicons name="checkmark-circle" size={14} color="#065F46" />
          <Text style={s.successBannerText}>Handover created — incoming guard will be notified</Text>
        </View>
      )}
      {ackErr ? (
        <View style={s.errBanner}>
          <Ionicons name="alert-circle-outline" size={14} color="#991B1B" />
          <Text style={s.errBannerText}>{ackErr}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'today' ? (
          loadingToday
            ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            : todayHandovers.map(h => renderHandover(h, true))
        ) : (
          loadingHistory
            ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            : history.map(h => renderHandover(h, false))
        )}
      </ScrollView>

      {/* Create handover modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Handover Log</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Shift Type</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.md }}>
                {(['MORNING', 'AFTERNOON', 'NIGHT'] as ShiftType[]).map(st => {
                  const sm = SHIFT_META[st];
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[s.shiftChip, newShift === st && { backgroundColor: sm.bg, borderColor: sm.color }]}
                      onPress={() => setNewShift(st)}
                    >
                      <Ionicons name={sm.icon} size={14} color={newShift === st ? sm.color : COLORS.textMuted} />
                      <Text style={[s.shiftChipText, newShift === st && { color: sm.color }]}>{sm.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.label}>Handover Items</Text>
              {newItems.map((item, idx) => (
                <View key={idx} style={s.newItemCard}>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    {Object.keys(CATEGORY_META).map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[s.miniChip, item.category === cat && s.miniChipActive]}
                        onPress={() => updateItem(idx, { category: cat as any })}
                      >
                        <Text style={[s.miniChipText, item.category === cat && s.miniChipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={s.input}
                    placeholder="Describe the item..."
                    placeholderTextColor={COLORS.textMuted}
                    value={item.description}
                    onChangeText={v => updateItem(idx, { description: v })}
                    multiline
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                      <TouchableOpacity
                        key={p}
                        style={[s.miniChip, item.priority === p && { backgroundColor: PRIORITY_META[p].bg, borderColor: PRIORITY_META[p].color }]}
                        onPress={() => updateItem(idx, { priority: p })}
                      >
                        <Text style={[s.miniChipText, item.priority === p && { color: PRIORITY_META[p].color }]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <Text style={s.resolvedLabel}>Resolved</Text>
                      <Switch
                        value={item.resolvedBefore}
                        onValueChange={v => updateItem(idx, { resolvedBefore: v })}
                        trackColor={{ false: '#E2E8F0', true: '#A7F3D0' }}
                        thumbColor={item.resolvedBefore ? '#059669' : '#94A3B8'}
                      />
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={s.addItemBtn} onPress={() => setNewItems(prev => [...prev, { ...BLANK_ITEM }])}>
                <Ionicons name="add-circle-outline" size={16} color={ACCENT} />
                <Text style={s.addItemBtnText}>Add Another Item</Text>
              </TouchableOpacity>

              <Text style={[s.label, { marginTop: SPACING.md }]}>Notes (Optional)</Text>
              <TextInput
                style={[s.input, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Any additional notes for the incoming guard..."
                placeholderTextColor={COLORS.textMuted}
                value={newNotes}
                onChangeText={setNewNotes}
                multiline
              />
            </ScrollView>

            {createErr ? (
              <View style={s.modalErrBanner}>
                <Ionicons name="alert-circle-outline" size={14} color="#991B1B" />
                <Text style={s.modalErrText}>{createErr}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[s.submitBtn, createMutation.isPending && { opacity: 0.7 }]}
              onPress={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.submitBtnText}>Create Handover Log</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(217,119,6,0.15)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, ...SHADOWS.sm },
  createBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(217,119,6,0.1)' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: ACCENT },
  tabLabel: { fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium', fontWeight: '600' },
  tabLabelActive: { color: ACCENT, fontFamily: 'Outfit-Bold', fontWeight: '700' },

  scrollContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(217,119,6,0.15)', ...SHADOWS.sm },
  cardPending: { borderColor: '#FDE68A', borderWidth: 2 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', padding: SPACING.sm, paddingHorizontal: SPACING.md },
  pendingBannerText: { fontSize: 11, fontWeight: '700', color: '#92400E', fontFamily: 'Outfit-Bold', flex: 1 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  shiftPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  shiftPillText: { fontSize: 11, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  guardName: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  handoverTime: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  statusChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  statusChipText: { fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  itemsList: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, borderTopWidth: 1, borderTopColor: 'rgba(217,119,6,0.1)', paddingTop: SPACING.sm, gap: SPACING.sm },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itemIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  itemDesc: { fontSize: 12, color: COLORS.text, fontFamily: 'DMSans-Regular', lineHeight: 17 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  priChip: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  priChipText: { fontSize: 9, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  catLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  resolvedChip: { backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  resolvedText: { fontSize: 9, fontWeight: '700', color: '#059669', fontFamily: 'Outfit-Bold' },

  notesBox: { backgroundColor: '#FFFBEB', borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: 4 },
  notesLabel: { fontSize: 10, fontWeight: '700', color: '#92400E', fontFamily: 'Outfit-Bold', marginBottom: 2 },
  notesText: { fontSize: 12, color: '#78350F', fontFamily: 'DMSans-Regular', lineHeight: 16 },

  ackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#059669', paddingVertical: 10, borderRadius: RADIUS.md, marginTop: SPACING.sm, ...SHADOWS.sm },
  ackBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 5, fontFamily: 'DMSans-Medium' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular', marginBottom: 0 },
  shiftChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  shiftChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  newItemCard: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: SPACING.sm },
  miniChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  miniChipActive: { backgroundColor: '#FEF3C7', borderColor: ACCENT },
  miniChipText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  miniChipTextActive: { color: ACCENT, fontFamily: 'Outfit-Bold', fontWeight: '700' },
  resolvedLabel: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, justifyContent: 'center', borderWidth: 1, borderColor: ACCENT, borderRadius: RADIUS.md, borderStyle: 'dashed' },
  addItemBtnText: { fontSize: 13, fontWeight: '700', color: ACCENT, fontFamily: 'Outfit-Bold' },
  submitBtn: { backgroundColor: ACCENT, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.md, ...SHADOWS.sm },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#A7F3D0' },
  successBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#065F46', fontFamily: 'DMSans-Medium' },
  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FECACA' },
  errBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#991B1B', fontFamily: 'DMSans-Regular' },
  ackSuccess: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm },
  ackSuccessText: { fontSize: 12, fontWeight: '600', color: '#065F46', fontFamily: 'DMSans-Medium', flex: 1 },
  modalErrBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm },
  modalErrText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#991B1B', fontFamily: 'DMSans-Regular' },
});
