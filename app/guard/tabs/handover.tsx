import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Switch, KeyboardAvoidingView,
  Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { useAuth } from '@/hooks/useAuth';
import {
  shiftHandoverService,
  type ShiftHandover,
  type ShiftType,
  type HandoverItem,
  type HandoverStatus,
  type CreateHandoverRequest,
} from '@/services/shiftHandoverService';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type ItemCategory = HandoverItem['category'];
type ItemPriority = HandoverItem['priority'];
type NewItem = Omit<HandoverItem, 'id'>;

// ─────────────── Metadata maps ───────────────

const SHIFT_META: Record<ShiftType, {
  label: string; icon: IoniconsName; color: string; bg: string; time: string;
}> = {
  MORNING:   { label: 'Morning',   icon: 'sunny-outline',          color: '#D97706', bg: '#FEF3C7', time: '06:00 – 14:00' },
  AFTERNOON: { label: 'Afternoon', icon: 'partly-sunny-outline',   color: '#2563EB', bg: '#DBEAFE', time: '14:00 – 22:00' },
  NIGHT:     { label: 'Night',     icon: 'moon-outline',           color: '#7C3AED', bg: '#EDE9FE', time: '22:00 – 06:00' },
};

const CATEGORY_META: Record<ItemCategory, { icon: IoniconsName; label: string }> = {
  VISITOR:     { icon: 'person-outline',               label: 'Visitor'     },
  VEHICLE:     { icon: 'car-outline',                  label: 'Vehicle'     },
  INCIDENT:    { icon: 'warning-outline',              label: 'Incident'    },
  MAINTENANCE: { icon: 'construct-outline',            label: 'Maintenance' },
  OTHER:       { icon: 'ellipsis-horizontal-outline',  label: 'Other'       },
};

const PRIORITY_META: Record<ItemPriority, { color: string; bg: string; label: string; border: string }> = {
  HIGH:   { color: '#DC2626', bg: '#FEE2E2', label: 'High',   border: '#FCA5A5' },
  MEDIUM: { color: '#D97706', bg: '#FEF3C7', label: 'Medium', border: '#FCD34D' },
  LOW:    { color: '#059669', bg: '#D1FAE5', label: 'Low',    border: '#6EE7B7' },
};

const BLANK_ITEM: NewItem = { category: 'OTHER', description: '', resolvedBefore: false, priority: 'MEDIUM' };

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}

// ─────────────── Handover Card ───────────────

interface HandoverCardProps {
  item: ShiftHandover;
  expanded: boolean;
  onToggle: () => void;
  ackLoading: boolean;
  onAcknowledge: () => void;
  showAck?: boolean;
}

function HandoverCard({ item, expanded, onToggle, ackLoading, onAcknowledge, showAck = true }: HandoverCardProps) {
  const sm = SHIFT_META[item.shiftType];
  const pending = item.status === 'PENDING';

  return (
    <View style={[s.card, pending && s.cardPending]}>
      {/* Pending banner */}
      {pending && showAck && (
        <View style={s.pendingBanner}>
          <Ionicons name="time-outline" size={13} color="#92400E" />
          <Text style={s.pendingBannerText}>Incoming shift — acknowledge this handover</Text>
        </View>
      )}

      {/* Tap header */}
      <TouchableOpacity style={s.cardHeader} onPress={onToggle} activeOpacity={0.8}>
        <View style={[s.shiftPill, { backgroundColor: sm.bg }]}>
          <Ionicons name={sm.icon} size={14} color={sm.color} />
          <Text style={[s.shiftPillText, { color: sm.color }]}>{sm.label}</Text>
        </View>
        <View style={s.cardMeta}>
          <Text style={s.guardName}>{item.outgoingGuardName}</Text>
          <Text style={s.handoverSub}>{item.date !== new Date().toISOString().split('T')[0] ? fmtDate(item.date) + ' · ' : ''}{item.handoverTime} · {item.items.length} item{item.items.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={[s.statusChip, { backgroundColor: pending ? '#FEF3C7' : '#D1FAE5' }]}>
          <Text style={[s.statusChipText, { color: pending ? '#92400E' : '#065F46' }]}>
            {pending ? 'Pending' : 'Done'}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.textMuted}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      {/* Expanded body */}
      {expanded && (
        <View style={s.itemsBody}>
          {item.items.map((it, idx) => {
            const cat = CATEGORY_META[it.category] ?? CATEGORY_META.OTHER;
            const pri = PRIORITY_META[it.priority];
            return (
              <View key={it.id ?? idx} style={s.itemRow}>
                <View style={s.itemIconBox}>
                  <Ionicons name={cat.icon} size={14} color={GUARD_COLORS.accent} />
                </View>
                <View style={s.itemContent}>
                  <Text style={s.itemDesc}>{it.description}</Text>
                  <View style={s.itemChips}>
                    <View style={[s.priChip, { backgroundColor: pri.bg, borderColor: pri.border }]}>
                      <Text style={[s.priChipText, { color: pri.color }]}>{pri.label}</Text>
                    </View>
                    <Text style={s.catLabel}>{cat.label}</Text>
                    {it.resolvedBefore && (
                      <View style={s.resolvedChip}>
                        <Ionicons name="checkmark-circle" size={9} color="#059669" />
                        <Text style={s.resolvedText}>Resolved</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {!!item.notes && (
            <View style={s.notesBox}>
              <Text style={s.notesLabel}>Notes from outgoing guard</Text>
              <Text style={s.notesText}>{item.notes}</Text>
            </View>
          )}

          {!!item.incomingGuardName && (
            <View style={s.incomingRow}>
              <Ionicons name="person-circle-outline" size={14} color={COLORS.textMuted} />
              <Text style={s.incomingText}>Incoming: {item.incomingGuardName}</Text>
              {item.acknowledgedAt && (
                <Text style={s.ackTimeText}>· Ack {new Date(item.acknowledgedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
              )}
            </View>
          )}

          {pending && showAck && (
            <TouchableOpacity
              style={[s.ackBtn, ackLoading && { opacity: 0.7 }]}
              onPress={onAcknowledge}
              disabled={ackLoading}
            >
              {ackLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={s.ackBtnText}>Acknowledge Handover</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─────────────── Main Screen ───────────────

export default function GuardHandoverScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<'today' | 'history'>('today');
  const [todayList, setTodayList] = useState<ShiftHandover[]>([]);
  const [historyList, setHistoryList] = useState<ShiftHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [ackingId, setAckingId] = useState<number | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newShift, setNewShift] = useState<ShiftType>('AFTERNOON');
  const [newItems, setNewItems] = useState<NewItem[]>([{ ...BLANK_ITEM }]);
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const [todayRes, historyRes] = await Promise.allSettled([
      shiftHandoverService.getTodayHandovers(),
      shiftHandoverService.getHandoverHistory(30),
    ]);
    if (todayRes.status === 'fulfilled')   setTodayList(todayRes.value);
    if (historyRes.status === 'fulfilled') setHistoryList(historyRes.value);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleAcknowledge = async (id: number) => {
    setAckingId(id);
    try {
      const updated = await shiftHandoverService.acknowledgeHandover(id);
      setTodayList(prev => prev.map(h => h.id === id ? updated : h));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not acknowledge handover.');
    } finally {
      setAckingId(null);
    }
  };

  const updateItem = (idx: number, patch: Partial<NewItem>) =>
    setNewItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const removeItem = (idx: number) =>
    setNewItems(prev => prev.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    const validItems = newItems.filter(i => i.description.trim());
    if (validItems.length === 0) {
      Alert.alert('Required', 'Add at least one handover item with a description.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await shiftHandoverService.createHandover({
        shiftType: newShift,
        items: validItems,
        notes: newNotes.trim() || undefined,
      });
      setTodayList(prev => [created, ...prev]);
      setShowCreate(false);
      setNewItems([{ ...BLANK_ITEM }]);
      setNewNotes('');
      setTab('today');
      setExpandedId(created.id);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not create handover log.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayList = tab === 'today' ? todayList : historyList;
  const pendingCount = todayList.filter(h => h.status === 'PENDING').length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Shift Handover</Text>
          {pendingCount > 0 && (
            <View style={s.pendingDot}>
              <Text style={s.pendingDotText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.newBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['today', 'history'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tabItem, tab === t && s.tabItemActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
              {t === 'today' ? "Today's Handovers" : 'History'}
            </Text>
            {t === 'today' && pendingCount > 0 && (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={GUARD_COLORS.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        >
          {displayList.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="document-text-outline" size={52} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No handovers</Text>
              <Text style={s.emptyDesc}>
                {tab === 'today' ? 'No handover logs for today yet.' : 'No history found.'}
              </Text>
              {tab === 'today' && (
                <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
                  <Text style={s.emptyBtnText}>Create Handover Log</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            displayList.map(h => (
              <HandoverCard
                key={h.id}
                item={h}
                expanded={expandedId === h.id}
                onToggle={() => setExpandedId(expandedId === h.id ? null : h.id)}
                ackLoading={ackingId === h.id}
                onAcknowledge={() => handleAcknowledge(h.id)}
                showAck={tab === 'today'}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Create handover bottom sheet */}
      <Modal visible={showCreate} transparent animationType="slide">
        <KeyboardAvoidingView
          style={s.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowCreate(false)} />
          <View style={s.bottomSheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeaderRow}>
              <Text style={s.sheetTitle}>New Handover Log</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Shift type */}
              <Text style={s.fieldLabel}>Shift Type</Text>
              <View style={s.shiftRow}>
                {(['MORNING', 'AFTERNOON', 'NIGHT'] as ShiftType[]).map(st => {
                  const sm = SHIFT_META[st];
                  const sel = newShift === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[s.shiftChip, sel && { backgroundColor: sm.bg, borderColor: sm.color }]}
                      onPress={() => setNewShift(st)}
                    >
                      <Ionicons name={sm.icon} size={14} color={sel ? sm.color : COLORS.textMuted} />
                      <View>
                        <Text style={[s.shiftChipLabel, sel && { color: sm.color }]}>{sm.label}</Text>
                        <Text style={s.shiftChipTime}>{sm.time}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Items */}
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>Handover Items</Text>
              {newItems.map((item, idx) => (
                <View key={idx} style={s.newItemCard}>
                  {/* Remove button (only if more than 1 item) */}
                  {newItems.length > 1 && (
                    <TouchableOpacity style={s.removeItemBtn} onPress={() => removeItem(idx)}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}

                  {/* Category chips */}
                  <Text style={s.miniLabel}>Category</Text>
                  <View style={s.chipRow}>
                    {(Object.keys(CATEGORY_META) as ItemCategory[]).map(cat => {
                      const sel = item.category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[s.miniChip, sel && s.miniChipActive]}
                          onPress={() => updateItem(idx, { category: cat })}
                        >
                          <Ionicons
                            name={CATEGORY_META[cat].icon}
                            size={10}
                            color={sel ? GUARD_COLORS.accent : COLORS.textMuted}
                          />
                          <Text style={[s.miniChipText, sel && s.miniChipTextActive]}>
                            {CATEGORY_META[cat].label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Description */}
                  <TextInput
                    style={s.itemInput}
                    placeholder="Describe the handover item..."
                    placeholderTextColor={COLORS.textMuted}
                    value={item.description}
                    onChangeText={v => updateItem(idx, { description: v })}
                    multiline
                  />

                  {/* Priority + resolved */}
                  <View style={s.itemFooterRow}>
                    <View style={s.priRow}>
                      {(['LOW', 'MEDIUM', 'HIGH'] as ItemPriority[]).map(p => {
                        const pm = PRIORITY_META[p];
                        const sel = item.priority === p;
                        return (
                          <TouchableOpacity
                            key={p}
                            style={[s.priBtn, sel && { backgroundColor: pm.bg, borderColor: pm.color }]}
                            onPress={() => updateItem(idx, { priority: p })}
                          >
                            <Text style={[s.priBtnText, sel && { color: pm.color }]}>{pm.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={s.resolvedRow}>
                      <Text style={s.resolvedLabel}>Resolved</Text>
                      <Switch
                        value={item.resolvedBefore}
                        onValueChange={v => updateItem(idx, { resolvedBefore: v })}
                        trackColor={{ false: COLORS.border, true: '#A7F3D0' }}
                        thumbColor={item.resolvedBefore ? '#059669' : '#94A3B8'}
                      />
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={s.addItemBtn}
                onPress={() => setNewItems(prev => [...prev, { ...BLANK_ITEM }])}
              >
                <Ionicons name="add-circle-outline" size={16} color={GUARD_COLORS.accent} />
                <Text style={s.addItemBtnText}>Add Another Item</Text>
              </TouchableOpacity>

              {/* Notes */}
              <Text style={[s.fieldLabel, { marginTop: 14 }]}>Notes (Optional)</Text>
              <TextInput
                style={[s.textInput, { height: 72, textAlignVertical: 'top' }]}
                placeholder="Any additional notes for the incoming guard..."
                placeholderTextColor={COLORS.textMuted}
                value={newNotes}
                onChangeText={setNewNotes}
                multiline
              />

              {/* Submit */}
              <TouchableOpacity
                style={[s.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.submitBtnText}>Submit Handover Log</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text },
  pendingDot: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  pendingDotText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: GUARD_COLORS.accent, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.md, ...SHADOWS.sm,
  },
  newBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: GUARD_COLORS.accent },
  tabLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabLabelActive: { color: GUARD_COLORS.accent, fontWeight: '700' },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 9, fontWeight: '800', color: '#92400E' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 12, gap: 10, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardPending: { borderColor: '#FDE68A', borderWidth: 2 },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 7,
  },
  pendingBannerText: { fontSize: 11, fontWeight: '700', color: '#92400E', flex: 1 },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10,
  },
  shiftPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  shiftPillText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flex: 1 },
  guardName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  handoverSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusChipText: { fontSize: 10, fontWeight: '700' },

  // Items body (expanded)
  itemsBody: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: 12, gap: 10,
  },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemIconBox: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: GUARD_COLORS.accentLight, alignItems: 'center', justifyContent: 'center',
  },
  itemContent: { flex: 1 },
  itemDesc: { fontSize: 12, color: COLORS.text, lineHeight: 17 },
  itemChips: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  priChip: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1,
  },
  priChipText: { fontSize: 9, fontWeight: '700' },
  catLabel: { fontSize: 10, color: COLORS.textMuted },
  resolvedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  resolvedText: { fontSize: 9, fontWeight: '700', color: '#059669' },
  notesBox: {
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  notesLabel: { fontSize: 10, fontWeight: '700', color: '#92400E', marginBottom: 3 },
  notesText: { fontSize: 12, color: '#78350F', lineHeight: 17 },
  incomingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  incomingText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  ackTimeText: { fontSize: 11, color: COLORS.textMuted },
  ackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#059669', paddingVertical: 10, borderRadius: RADIUS.md, ...SHADOWS.sm,
    marginTop: 4,
  },
  ackBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    marginTop: 20, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: GUARD_COLORS.accent, borderRadius: RADIUS.md,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 20, paddingBottom: 36, maxHeight: '92%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  sheetHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },

  // Form
  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  shiftRow: { flexDirection: 'row', gap: 8 },
  shiftChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 9, paddingHorizontal: 8, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt,
  },
  shiftChipLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  shiftChipTime: { fontSize: 9, color: COLORS.textMuted, marginTop: 1 },

  newItemCard: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg,
    padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
    position: 'relative',
  },
  removeItemBtn: { position: 'absolute', top: 8, right: 8, zIndex: 1 },
  miniLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  miniChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  miniChipActive: { backgroundColor: GUARD_COLORS.accentLight, borderColor: GUARD_COLORS.accent },
  miniChipText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  miniChipTextActive: { color: GUARD_COLORS.accentDark, fontWeight: '700' },
  itemInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 13,
    color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
    minHeight: 52, textAlignVertical: 'top', marginBottom: 8,
  },
  itemFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priRow: { flexDirection: 'row', gap: 6 },
  priBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  priBtnText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  resolvedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resolvedLabel: { fontSize: 11, color: COLORS.textMuted },

  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderWidth: 1, borderColor: GUARD_COLORS.accent,
    borderRadius: RADIUS.md, borderStyle: 'dashed', marginBottom: 4,
  },
  addItemBtnText: { fontSize: 13, fontWeight: '700', color: GUARD_COLORS.accent },

  textInput: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  submitBtn: {
    backgroundColor: GUARD_COLORS.accent, paddingVertical: 14,
    borderRadius: RADIUS.md, alignItems: 'center', marginTop: 16, marginBottom: 8, ...SHADOWS.sm,
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
