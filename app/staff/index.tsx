import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Modal, TextInput, Alert,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BackHandler } from 'react-native';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  staffService,
  StaffMember, StaffAttendanceLog,
  StaffRole, RegisterStaffRequest,
} from '@/services/staffService';

const ROLE_META: Record<StaffRole, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  MAID:      { label: 'Maid',       icon: 'home-outline',       color: '#7C3AED', bg: '#F5F3FF' },
  COOK:      { label: 'Cook',       icon: 'restaurant-outline', color: '#D97706', bg: '#FEF3C7' },
  DRIVER:    { label: 'Driver',     icon: 'car-outline',        color: '#2563EB', bg: '#DBEAFE' },
  NANNY:     { label: 'Nanny',      icon: 'heart-outline',      color: '#DB2777', bg: '#FCE7F3' },
  GARDENER:  { label: 'Gardener',   icon: 'leaf-outline',       color: '#059669', bg: '#D1FAE5' },
  SECURITY:  { label: 'Security',   icon: 'shield-outline',     color: '#374151', bg: '#F3F4F6' },
  OTHER:     { label: 'Other',      icon: 'person-outline',     color: '#6B7280', bg: '#F3F4F6' },
};

const ROLES: StaffRole[] = ['MAID', 'COOK', 'DRIVER', 'NANNY', 'GARDENER', 'SECURITY', 'OTHER'];

type TabKey = 'staff' | 'attendance';

const MOCK_TODAY_ATTENDANCE: StaffAttendanceLog[] = [
  { id: 1, staffId: 1, staffName: 'Lakshmi Devi', action: 'ENTRY', timestamp: new Date().toISOString(), gate: 'Gate 1' },
  { id: 2, staffId: 2, staffName: 'Ramu (Cook)', action: 'ENTRY', timestamp: new Date(Date.now() - 3600000).toISOString(), gate: 'Gate 1' },
  { id: 3, staffId: 3, staffName: 'Suresh (Driver)', action: 'EXIT', timestamp: new Date(Date.now() - 1800000).toISOString(), gate: 'Gate 2' },
];

const MOCK_STAFF: StaffMember[] = [
  { id: 1, name: 'Lakshmi Devi', role: 'MAID', phone: '9876543210', status: 'ACTIVE', policeVerified: true, flatNumber: 'Tower A-1204' },
  { id: 2, name: 'Ramu', role: 'COOK', phone: '9123456789', status: 'ACTIVE', policeVerified: false, flatNumber: 'Tower A-1204' },
  { id: 3, name: 'Suresh Kumar', role: 'DRIVER', phone: '9988776655', status: 'ACTIVE', policeVerified: true, flatNumber: 'Tower A-1204' },
];

function timeAgo(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export default function StaffScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [tab, setTab] = useState<TabKey>('staff');
  const [addModal, setAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState<RegisterStaffRequest>({
    name: '', role: 'MAID', phone: '', aadhaarLast4: '', agencyName: '', notes: '',
  });

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (addModal) { setAddModal(false); return true; }
      goHome(); return true;
    });
    return () => sub.remove();
  }, [goHome, addModal]));

  const { data: staffList, isLoading: staffLoading, refetch: refetchStaff } = useQuery<StaffMember[]>({
    queryKey: ['staff', 'my-staff'],
    queryFn: () => staffService.getMyStaff(),
    staleTime: 30_000,
  });

  const { data: todayLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery<StaffAttendanceLog[]>({
    queryKey: ['staff', 'attendance-today'],
    queryFn: () => staffService.getTodayAttendance(),
    staleTime: 15_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchStaff(), refetchLogs()]); }
    finally { setRefreshing(false); }
  }, [refetchStaff, refetchLogs]);

  const staff = (staffList && staffList.length > 0) ? staffList : MOCK_STAFF;
  const logs = (todayLogs && todayLogs.length > 0) ? todayLogs : MOCK_TODAY_ATTENDANCE;

  const registerMutation = useMutation({
    mutationFn: (req: RegisterStaffRequest) => staffService.registerStaff(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setAddModal(false);
      setForm({ name: '', role: 'MAID', phone: '', aadhaarLast4: '', agencyName: '', notes: '' });
      Alert.alert('✅ Staff Registered', 'Staff member has been added to your household.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to register staff.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => staffService.removeStaff(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); },
    onError: (err: any) => { Alert.alert('Error', err.message); },
  });

  const handleRegister = () => {
    if (!form.name.trim()) {
      Alert.alert('Name Required', 'Please enter the staff member\'s name.');
      return;
    }
    registerMutation.mutate({ ...form, name: form.name.trim() });
  };

  const confirmRemove = (member: StaffMember) => {
    Alert.alert(
      'Remove Staff',
      `Remove ${member.name} from your household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(member.id) },
      ]
    );
  };

  const activeCount = staff.filter(s => s.status === 'ACTIVE').length;
  const todayEntries = logs.filter(l => l.action === 'ENTRY').length;
  const todayExits = logs.filter(l => l.action === 'EXIT').length;

  const renderStaffCard = ({ item }: { item: StaffMember }) => {
    const meta = ROLE_META[item.role] || ROLE_META.OTHER;
    return (
      <View style={s.card}>
        <View style={s.cardRow}>
          <View style={[s.roleIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={22} color={meta.color} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <View style={s.cardTitleRow}>
              <Text style={s.staffName}>{item.name}</Text>
              {item.policeVerified && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={11} color="#059669" />
                  <Text style={s.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={[s.rolePill, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <TouchableOpacity onPress={() => confirmRemove(item)} style={s.removeBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={s.cardMeta}>
          {item.phone && (
            <View style={s.metaChip}>
              <Ionicons name="call-outline" size={12} color={COLORS.textMuted} />
              <Text style={s.metaChipText}>{item.phone}</Text>
            </View>
          )}
          {item.agencyName && (
            <View style={s.metaChip}>
              <Ionicons name="business-outline" size={12} color={COLORS.textMuted} />
              <Text style={s.metaChipText}>{item.agencyName}</Text>
            </View>
          )}
          <View style={[s.statusDot, { backgroundColor: item.status === 'ACTIVE' ? '#059669' : '#94A3B8' }]} />
          <Text style={s.statusLabel}>{item.status}</Text>
        </View>
      </View>
    );
  };

  const renderLogItem = ({ item }: { item: StaffAttendanceLog }) => (
    <View style={s.logRow}>
      <View style={[s.actionDot, { backgroundColor: item.action === 'ENTRY' ? '#059669' : '#EF4444' }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.logName}>{item.staffName}</Text>
        {item.gate && <Text style={s.logGate}>{item.gate}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[s.logAction, { color: item.action === 'ENTRY' ? '#059669' : '#EF4444' }]}>
          {item.action === 'ENTRY' ? '↓ Entered' : '↑ Exited'}
        </Text>
        <Text style={s.logTime}>{timeAgo(item.timestamp)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Domestic Staff</Text>
          <Text style={s.headerSub}>Track household staff & attendance</Text>
        </View>
        <TouchableOpacity onPress={() => setAddModal(true)} style={s.addBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statVal}>{activeCount}</Text>
          <Text style={s.statLabel}>My Staff</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statVal, { color: '#059669' }]}>{todayEntries}</Text>
          <Text style={s.statLabel}>Entries Today</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statVal, { color: '#EF4444' }]}>{todayExits}</Text>
          <Text style={s.statLabel}>Exits Today</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={s.tabBar}>
        <TouchableOpacity style={[s.tabBtn, tab === 'staff' && s.tabBtnActive]} onPress={() => setTab('staff')}>
          <Text style={[s.tabText, tab === 'staff' && s.tabTextActive]}>My Staff ({staff.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'attendance' && s.tabBtnActive]} onPress={() => setTab('attendance')}>
          <Text style={[s.tabText, tab === 'attendance' && s.tabTextActive]}>Today's Log</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {tab === 'staff' ? (
        <FlatList
          data={staff}
          keyExtractor={item => String(item.id)}
          renderItem={renderStaffCard}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            staffLoading ? (
              <View style={s.empty}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            ) : (
              <View style={s.empty}>
                <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>No staff registered</Text>
                <Text style={s.emptySub}>Add your maid, cook, driver and other household staff</Text>
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => String(item.id)}
          renderItem={renderLogItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            logsLoading ? (
              <View style={s.empty}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            ) : (
              <View style={s.empty}>
                <Ionicons name="time-outline" size={48} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>No entries today</Text>
                <Text style={s.emptySub}>Staff attendance logs will appear here</Text>
              </View>
            )
          }
        />
      )}

      {/* Add Staff Modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>Register Staff</Text>
                  <Text style={s.modalSub}>Add household staff for tracking</Text>
                </View>
                <TouchableOpacity onPress={() => setAddModal(false)}>
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Role selector */}
              <Text style={s.label}>Role</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {ROLES.map(r => {
                    const m = ROLE_META[r];
                    const sel = form.role === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[s.roleChip, sel && { backgroundColor: m.color, borderColor: m.color }]}
                        onPress={() => setForm(f => ({ ...f, role: r }))}
                      >
                        <Ionicons name={m.icon} size={14} color={sel ? '#fff' : m.color} />
                        <Text style={[s.roleChipText, sel && { color: '#fff' }]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={s.label}>Name *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Lakshmi Devi"
                placeholderTextColor={COLORS.textMuted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={s.label}>Phone (Optional)</Text>
              <TextInput
                style={s.input}
                placeholder="9876543210"
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.textMuted}
                value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
              />

              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Aadhaar Last 4</Text>
                  <TextInput
                    style={s.input}
                    placeholder="XXXX"
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholderTextColor={COLORS.textMuted}
                    value={form.aadhaarLast4}
                    onChangeText={v => setForm(f => ({ ...f, aadhaarLast4: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Agency (Optional)</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Agency name"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.agencyName}
                    onChangeText={v => setForm(f => ({ ...f, agencyName: v }))}
                  />
                </View>
              </View>

              <Text style={s.label}>Notes</Text>
              <TextInput
                style={[s.input, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Any additional notes..."
                multiline
                placeholderTextColor={COLORS.textMuted}
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              />

              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setAddModal(false)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.confirmBtn, registerMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleRegister}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.confirmText}>Register Staff</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: 'rgba(124,58,237,0.12)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7C3AED', paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, ...SHADOWS.sm },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  statCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  statVal: { fontSize: 20, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },

  tabBar: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', gap: 8 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: '#F1F5F9' },
  tabBtnActive: { backgroundColor: '#7C3AED' },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: '#fff', fontWeight: '700', fontFamily: 'Outfit-Bold' },

  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(124,58,237,0.12)', ...SHADOWS.md },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  roleIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  staffName: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#D1FAE5', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  verifiedText: { fontSize: 9, fontWeight: '700', color: '#059669', fontFamily: 'Outfit-Bold' },
  rolePill: { fontSize: 12, fontWeight: '600', fontFamily: 'DMSans-Medium', marginTop: 2 },
  removeBtn: { padding: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.sm, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  metaChipText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  logRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  actionDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
  logName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  logGate: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  logAction: { fontSize: 12, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  logTime: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 30, fontFamily: 'DMSans-Regular' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4, marginTop: 10, fontFamily: 'DMSans-Medium' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular' },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.md, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  roleChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#7C3AED', alignItems: 'center', ...SHADOWS.sm },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
});
