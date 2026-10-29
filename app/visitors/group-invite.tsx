import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Modal, TextInput, ScrollView,
} from 'react-native';
import { Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  groupInviteService,
  GroupInvite,
  GroupGuest,
  CreateGroupInviteRequest,
} from '@/services/groupInviteService';

const ACCENT = '#7C3AED';

const MOCK_INVITES: GroupInvite[] = [
  {
    id: 1,
    title: 'Diwali Gathering',
    eventDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '23:00',
    passCode: 'MANA-DIWALI22',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    totalGuests: 8,
    checkedIn: 3,
    guests: [
      { name: 'Rohan Sharma', phone: '9876500001', checkedIn: true },
      { name: 'Priya Mehta', phone: '9876500002', checkedIn: true },
      { name: 'Arjun Gupta', phone: '9876500003', vehicleNumber: 'KA-01-AB-1234', checkedIn: true },
      { name: 'Sneha Joshi', phone: '9876500004', checkedIn: false },
      { name: 'Vikram Nair', vehicleNumber: 'MH-04-CD-5678', checkedIn: false },
      { name: 'Anita Desai', phone: '9876500006', checkedIn: false },
      { name: 'Kiran Rao', checkedIn: false },
      { name: 'Suresh Pillai', phone: '9876500008', checkedIn: false },
    ],
  },
];

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPTY_GUEST = (): GroupGuest => ({ name: '', phone: '', vehicleNumber: '' });

export default function GroupInviteScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<CreateGroupInviteRequest>({
    title: '',
    eventDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '22:00',
    guests: [EMPTY_GUEST()],
  });

  const { data: raw, isLoading, refetch } = useQuery<GroupInvite[]>({
    queryKey: ['visitors', 'group-invites'],
    queryFn: () => groupInviteService.getMyGroupInvites(),
    staleTime: 30_000,
  });
  const invites = (raw && raw.length > 0) ? raw : MOCK_INVITES;

  const activeInvites = invites.filter(i => i.status === 'ACTIVE');
  const pastInvites   = invites.filter(i => i.status !== 'ACTIVE');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const createMutation = useMutation({
    mutationFn: (data: CreateGroupInviteRequest) => groupInviteService.createGroupInvite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors', 'group-invites'] });
      setShowCreate(false);
      setCreateError('');
      setForm({ title: '', eventDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0], startTime: '18:00', endTime: '22:00', guests: [EMPTY_GUEST()] });
    },
    onError: (err: any) => setCreateError(err?.message || 'Failed to create invite. Try again.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => groupInviteService.cancelGroupInvite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors', 'group-invites'] }),
  });

  const handleCreate = () => {
    const validGuests = form.guests.filter(g => g.name.trim());
    if (!form.title.trim()) { setCreateError('Please enter an event title.'); return; }
    if (validGuests.length === 0) { setCreateError('Please add at least one guest.'); return; }
    setCreateError('');
    createMutation.mutate({ ...form, guests: validGuests });
  };

  const addGuest = () => {
    if (form.guests.length >= 50) return;
    setForm(f => ({ ...f, guests: [...f.guests, EMPTY_GUEST()] }));
  };

  const updateGuest = (idx: number, field: keyof GroupGuest, value: string) => {
    setForm(f => {
      const guests = [...f.guests];
      guests[idx] = { ...guests[idx], [field]: value };
      return { ...f, guests };
    });
  };

  const removeGuest = (idx: number) => {
    setForm(f => ({ ...f, guests: f.guests.filter((_, i) => i !== idx) }));
  };

  const renderCard = ({ item }: { item: GroupInvite }) => {
    const isExpanded = expanded === item.id;
    const pct = item.totalGuests > 0 ? (item.checkedIn / item.totalGuests) * 100 : 0;
    const isPast = item.status !== 'ACTIVE';
    return (
      <TouchableOpacity
        style={[s.card, isPast && { opacity: 0.7 }]}
        onPress={() => setExpanded(isExpanded ? null : item.id)}
        activeOpacity={0.85}
      >
        <View style={s.cardTop}>
          <View style={[s.eventIcon, { backgroundColor: isPast ? '#F3F4F6' : '#F5F3FF' }]}>
            <Ionicons name="people" size={22} color={isPast ? COLORS.textMuted : ACCENT} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.cardTitle}>{item.title}</Text>
            <Text style={s.cardDate}>{fmtDate(item.eventDate)} · {item.startTime}–{item.endTime}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: item.status === 'ACTIVE' ? '#F5F3FF' : '#F3F4F6' }]}>
            <Text style={[s.statusText, { color: item.status === 'ACTIVE' ? ACCENT : COLORS.textMuted }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Ionicons name="people-outline" size={12} color={ACCENT} />
            <Text style={s.statText}>{item.totalGuests} guests</Text>
          </View>
          <View style={s.statChip}>
            <Ionicons name="checkmark-circle-outline" size={12} color="#059669" />
            <Text style={[s.statText, { color: '#059669' }]}>{item.checkedIn} checked in</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.progressRow}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={s.progressPct}>{pct.toFixed(0)}%</Text>
        </View>

        {/* Pass code */}
        <View style={s.passRow}>
          <View style={s.passPill}>
            <Ionicons name="key-outline" size={12} color={ACCENT} />
            <Text style={s.passCode}>{item.passCode}</Text>
          </View>
          {item.status === 'ACTIVE' && (
            <TouchableOpacity
              style={s.shareBtn}
              onPress={() => Share.share({ message: `Mana Community Group Invite\nEvent: ${item.title}\nPass Code: ${item.passCode}\nDate: ${fmtDate(item.eventDate)}\n\nShare this code with your guests at the gate.` })}
            >
              <Ionicons name="share-outline" size={14} color={ACCENT} />
              <Text style={s.shareBtnText}>Share</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Expanded guest list */}
        {isExpanded && (
          <View style={s.guestList}>
            <Text style={s.guestListTitle}>Guest List</Text>
            {item.guests.map((g, i) => (
              <View key={i} style={s.guestRow}>
                <View style={[s.guestDot, { backgroundColor: g.checkedIn ? '#059669' : '#E2E8F0' }]} />
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Text style={s.guestName}>{g.name}</Text>
                  {(g.phone || g.vehicleNumber) && (
                    <Text style={s.guestMeta}>
                      {[g.phone, g.vehicleNumber].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                {g.checkedIn && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
              </View>
            ))}
          </View>
        )}

        {/* Cancel button */}
        {item.status === 'ACTIVE' && (
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => setCancelConfirmId(item.id)}
          >
            <Text style={s.cancelBtnText}>Cancel Invite</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const displayList = tab === 'active' ? activeInvites : pastInvites;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Group Invite</Text>
          <Text style={s.headerSub}>Bulk guest passes for events & parties</Text>
        </View>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={s.newBtn} hitSlop={8}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabBar}>
        {(['active', 'past'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabItem, tab === t && s.tabItemActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
              {t === 'active' ? `Active (${activeInvites.length})` : `Past (${pastInvites.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayList}
        keyExtractor={item => String(item.id)}
        renderItem={renderCard}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.empty}><ActivityIndicator size="large" color={ACCENT} /></View>
          ) : (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>{tab === 'active' ? 'No active invites' : 'No past invites'}</Text>
              <Text style={s.emptySub}>
                {tab === 'active'
                  ? 'Create a group invite to add multiple guests with a single pass code.'
                  : 'Past and cancelled invites will appear here.'}
              </Text>
              {tab === 'active' && (
                <TouchableOpacity style={s.emptyNewBtn} onPress={() => setShowCreate(true)}>
                  <Text style={s.emptyNewBtnText}>Create Invite</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Group Invite</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Event Title *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Diwali Party, Birthday Celebration"
                placeholderTextColor={COLORS.textMuted}
                value={form.title}
                onChangeText={v => setForm(f => ({ ...f, title: v }))}
              />

              <Text style={s.label}>Event Date</Text>
              <View style={[s.input, { justifyContent: 'center' }]}>
                <Text style={{ color: COLORS.text, fontFamily: 'DMSans-Regular', fontSize: 13 }}>
                  {fmtDate(form.eventDate)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Start Time</Text>
                  <TextInput
                    style={s.input}
                    placeholder="18:00"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.startTime}
                    onChangeText={v => setForm(f => ({ ...f, startTime: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>End Time</Text>
                  <TextInput
                    style={s.input}
                    placeholder="22:00"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.endTime}
                    onChangeText={v => setForm(f => ({ ...f, endTime: v }))}
                  />
                </View>
              </View>

              <View style={s.guestHeaderRow}>
                <Text style={s.label}>Guest List</Text>
                <View style={s.guestCountBadge}>
                  <Text style={s.guestCountText}>{form.guests.filter(g => g.name.trim()).length} / 50</Text>
                </View>
              </View>

              {form.guests.map((g, idx) => (
                <View key={idx} style={s.guestInputRow}>
                  <View style={{ flex: 2 }}>
                    <TextInput
                      style={[s.input, { marginBottom: 0 }]}
                      placeholder="Name *"
                      placeholderTextColor={COLORS.textMuted}
                      value={g.name}
                      onChangeText={v => updateGuest(idx, 'name', v)}
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <TextInput
                      style={[s.input, { marginBottom: 0 }]}
                      placeholder="Phone"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
                      value={g.phone}
                      onChangeText={v => updateGuest(idx, 'phone', v)}
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <TextInput
                      style={[s.input, { marginBottom: 0 }]}
                      placeholder="Vehicle"
                      placeholderTextColor={COLORS.textMuted}
                      value={g.vehicleNumber}
                      onChangeText={v => updateGuest(idx, 'vehicleNumber', v)}
                    />
                  </View>
                  {form.guests.length > 1 && (
                    <TouchableOpacity onPress={() => removeGuest(idx)} style={s.removeGuestBtn} hitSlop={6}>
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity style={s.addGuestBtn} onPress={addGuest}>
                <Ionicons name="add-circle-outline" size={18} color={ACCENT} />
                <Text style={s.addGuestText}>Add Guest</Text>
              </TouchableOpacity>

              {createError ? (
                <View style={s.inlineError}>
                  <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
                  <Text style={s.inlineErrorText}>{createError}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={[s.createBtn, createMutation.isPending && { opacity: 0.7 }]}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.createBtnText}>Create Invite ({form.guests.filter(g => g.name.trim()).length} guests)</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cancel invite confirm bottom sheet */}
      <Modal
        visible={cancelConfirmId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelConfirmId(null)}
      >
        <TouchableOpacity style={s.cancelOverlay} onPress={() => setCancelConfirmId(null)} activeOpacity={1} />
        <View style={s.cancelSheet}>
          <View style={s.cancelSheetHandle} />
          <Text style={s.cancelSheetTitle}>Cancel Invite?</Text>
          <Text style={s.cancelSheetSub}>
            Guests won't be able to enter with this pass code once cancelled.
          </Text>
          <TouchableOpacity
            style={[s.cancelConfirmBtn, cancelMutation.isPending && { opacity: 0.7 }]}
            onPress={() => { if (cancelConfirmId !== null) { cancelMutation.mutate(cancelConfirmId); setCancelConfirmId(null); } }}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.cancelConfirmText}>Cancel Invite</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.keepBtn} onPress={() => setCancelConfirmId(null)}>
            <Text style={s.keepBtnText}>Keep</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(124,58,237,0.12)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, ...SHADOWS.sm },
  newBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(124,58,237,0.1)' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: ACCENT },
  tabLabel: { fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium', fontWeight: '600' },
  tabLabelActive: { color: ACCENT, fontFamily: 'Outfit-Bold', fontWeight: '700' },

  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)', ...SHADOWS.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  eventIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', letterSpacing: -0.2 },
  cardDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  statText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium', fontWeight: '600' },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },
  progressPct: { fontSize: 11, fontWeight: '700', color: ACCENT, fontFamily: 'Outfit-Bold', width: 32, textAlign: 'right' },

  passRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  passPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7 },
  passCode: { fontSize: 13, fontWeight: '800', color: ACCENT, fontFamily: 'monospace', letterSpacing: 0.5 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.md, borderWidth: 1, borderColor: ACCENT },
  shareBtnText: { fontSize: 12, fontWeight: '700', color: ACCENT, fontFamily: 'Outfit-Bold' },

  guestList: { borderTopWidth: 1, borderTopColor: 'rgba(124,58,237,0.1)', paddingTop: SPACING.md, marginTop: SPACING.sm, gap: 6 },
  guestListTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium', marginBottom: 4 },
  guestRow: { flexDirection: 'row', alignItems: 'center' },
  guestDot: { width: 8, height: 8, borderRadius: 4 },
  guestName: { fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans-Medium' },
  guestMeta: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  cancelBtn: { marginTop: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: '#FEE2E2', alignItems: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#DC2626', fontFamily: 'Outfit-Bold' },

  empty: { alignItems: 'center', paddingTop: 70, gap: SPACING.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32, fontFamily: 'DMSans-Regular', lineHeight: 18 },
  emptyNewBtn: { marginTop: SPACING.md, backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.md, ...SHADOWS.sm },
  emptyNewBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 5, marginTop: SPACING.sm, fontFamily: 'DMSans-Medium' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular', marginBottom: SPACING.sm },

  guestHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm, marginBottom: 4 },
  guestCountBadge: { backgroundColor: ACCENT + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  guestCountText: { fontSize: 11, fontWeight: '700', color: ACCENT, fontFamily: 'Outfit-Bold' },

  guestInputRow: { flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' },
  removeGuestBtn: { padding: 4 },

  addGuestBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, justifyContent: 'center', borderWidth: 1, borderColor: ACCENT, borderRadius: RADIUS.md, borderStyle: 'dashed', marginBottom: SPACING.md },
  addGuestText: { fontSize: 13, fontWeight: '700', color: ACCENT, fontFamily: 'Outfit-Bold' },

  createBtn: { backgroundColor: ACCENT, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', ...SHADOWS.sm },
  createBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  inlineErrorText: { flex: 1, fontSize: 12, color: '#B91C1C', fontFamily: 'DMSans-Regular' },
  cancelOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  cancelSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 36, gap: 12 },
  cancelSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 8 },
  cancelSheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center', fontFamily: 'Outfit-Bold' },
  cancelSheetSub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: 'DMSans-Regular' },
  cancelConfirmBtn: { backgroundColor: '#EF4444', borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  cancelConfirmText: { fontSize: 15, fontWeight: '800', color: '#fff', fontFamily: 'Outfit-Bold' },
  keepBtn: { backgroundColor: '#F1F5F9', borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  keepBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
});
