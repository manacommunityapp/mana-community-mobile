import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  schoolBusService,
  RegisteredChild,
  BusTripLog,
  RegisterChildRequest,
} from '@/services/schoolBusService';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  AT_SCHOOL:        { label: 'At School',        color: '#059669', bg: '#D1FAE5', icon: 'school-outline' },
  EN_ROUTE_HOME:    { label: 'En Route Home',     color: '#2563EB', bg: '#DBEAFE', icon: 'navigate-outline' },
  EN_ROUTE_SCHOOL:  { label: 'En Route to School',color: '#D97706', bg: '#FEF3C7', icon: 'navigate-outline' },
  ARRIVED:          { label: 'Arrived',           color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle-outline' },
  IDLE:             { label: 'Idle',              color: '#6B7280', bg: '#F3F4F6', icon: 'time-outline' },
};


function formatTime(iso?: string) {
  if (!iso) return '--';
  if (/^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5);
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SchoolBusScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'children' | 'history'>('children');
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState<RegisterChildRequest>({ name: '', grade: '', schoolName: '', stopName: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [regSuccess, setRegSuccess] = useState('');
  const [regErr, setRegErr] = useState('');
  const [formErr, setFormErr] = useState('');

  const { data: rawChildren, isLoading: loadingChildren, refetch: refetchChildren } = useQuery<RegisteredChild[]>({
    queryKey: ['school-bus', 'my-children'],
    queryFn: () => schoolBusService.getMyChildren(),
    staleTime: 30_000,
  });
  const children = rawChildren ?? [];

  const { data: rawTrips, isLoading: loadingTrips, refetch: refetchTrips } = useQuery<BusTripLog[]>({
    queryKey: ['school-bus', 'trips', children[0]?.id],
    queryFn: () => children[0] ? schoolBusService.getTripHistory(children[0].id, { limit: 20 }) : Promise.resolve([]),
    enabled: !!children[0],
    staleTime: 60_000,
  });
  const trips = rawTrips ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchChildren(), refetchTrips()]); } finally { setRefreshing(false); }
  }, [refetchChildren, refetchTrips]);

  const registerMutation = useMutation({
    mutationFn: (data: RegisterChildRequest) => schoolBusService.registerChild(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-bus'] });
      setForm({ name: '', grade: '', schoolName: '', stopName: '' });
      setFormErr('');
      setRegErr('');
      setRegSuccess('Child registered for school bus tracking!');
      setTimeout(() => {
        setShowRegister(false);
        setRegSuccess('');
      }, 1800);
    },
    onError: (err: any) => {
      setRegErr(err.message || 'Failed to register. Please try again.');
    },
  });

  const handleRegister = () => {
    if (!form.name.trim() || !form.grade.trim() || !form.schoolName.trim()) {
      setFormErr('Please fill in name, grade, and school name.');
      return;
    }
    setFormErr('');
    registerMutation.mutate(form);
  };

  const primaryChild = children[0];
  const busStatus = primaryChild ? (STATUS_META['EN_ROUTE_HOME'] || STATUS_META.IDLE) : null;

  const renderChildCard = ({ item }: { item: RegisteredChild }) => (
    <View style={s.childCard}>
      <View style={s.childAvatar}>
        <Text style={s.childAvatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: SPACING.md }}>
        <Text style={s.childName}>{item.name}</Text>
        <Text style={s.childGrade}>{item.grade} · {item.schoolName}</Text>
        {item.busNumber && (
          <View style={s.busChip}>
            <Ionicons name="bus-outline" size={12} color="#D97706" />
            <Text style={s.busChipText}>Bus {item.busNumber}</Text>
            {item.stopName && <Text style={s.busChipText}> · {item.stopName}</Text>}
          </View>
        )}
      </View>
      {busStatus && (
        <View style={[s.statusBadge, { backgroundColor: busStatus.bg }]}>
          <Ionicons name={busStatus.icon} size={12} color={busStatus.color} />
          <Text style={[s.statusText, { color: busStatus.color }]}>{busStatus.label}</Text>
        </View>
      )}
    </View>
  );

  const renderTripRow = ({ item }: { item: BusTripLog }) => {
    const isHome = item.direction === 'FROM_SCHOOL';
    return (
      <View style={s.tripRow}>
        <View style={[s.tripIcon, { backgroundColor: isHome ? '#EEF2FF' : '#FEF3C7' }]}>
          <Ionicons name={isHome ? 'home-outline' : 'school-outline'} size={16} color={isHome ? COLORS.primary : '#D97706'} />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={s.tripLabel}>{isHome ? '← School to Home' : 'Home to School →'}</Text>
          <Text style={s.tripDate}>{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.tripTime}>{formatTime(item.pickedUpAt)} – {formatTime(item.droppedOffAt)}</Text>
          <View style={[s.tripBadge, { backgroundColor: item.childPickedUp ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[s.tripBadgeText, { color: item.childPickedUp ? '#059669' : '#DC2626' }]}>
              {item.childPickedUp ? 'Picked up' : 'Absent'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>School Bus</Text>
          <Text style={s.headerSub}>Live tracking & trip history</Text>
        </View>
        <TouchableOpacity onPress={() => setShowRegister(true)} style={s.headerAddBtn} hitSlop={8}>
          <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Live status banner */}
      {children.length > 0 && (
        <View style={s.liveBanner}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>Bus MH-12-3456</Text>
          <View style={[s.statusPill, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="navigate-outline" size={12} color="#2563EB" />
            <Text style={[s.statusPillText, { color: '#2563EB' }]}>En Route Home</Text>
          </View>
          <Text style={s.etaText}>ETA ~15 min</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabBar}>
        {(['children', 'history'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tabItem, activeTab === tab && s.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>
              {tab === 'children' ? 'My Children' : 'Trip History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'children' ? (
        <FlatList
          data={children}
          keyExtractor={item => String(item.id)}
          renderItem={renderChildCard}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            loadingChildren ? (
              <View style={s.empty}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            ) : (
              <View style={s.empty}>
                <Ionicons name="bus-outline" size={48} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>No children registered</Text>
                <Text style={s.emptySub}>Tap the + button to register your child for bus tracking.</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setShowRegister(true)}>
                  <Text style={s.emptyBtnText}>Register Child</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => String(item.id)}
          renderItem={renderTripRow}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            loadingTrips ? (
              <View style={s.empty}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            ) : (
              <View style={s.empty}>
                <Ionicons name="time-outline" size={48} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>No trips yet</Text>
                <Text style={s.emptySub}>Trip history will appear here once the bus starts running.</Text>
              </View>
            )
          }
        />
      )}

      {/* Register child modal */}
      <Modal visible={showRegister} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Register Child</Text>
              <TouchableOpacity onPress={() => setShowRegister(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {!!regSuccess && (
              <View style={s.successBanner}>
                <Text style={s.successBannerText}>{regSuccess}</Text>
              </View>
            )}
            {!!regErr && (
              <View style={s.errorBanner}>
                <Text style={s.errorBannerText}>{regErr}</Text>
              </View>
            )}
            {!!formErr && (
              <View style={s.errorBanner}>
                <Text style={s.errorBannerText}>{formErr}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: 'name',       label: "Child's Name",   placeholder: 'e.g. Aarav Kumar' },
                { key: 'grade',      label: 'Grade / Class',  placeholder: 'e.g. Grade 5' },
                { key: 'schoolName', label: 'School Name',    placeholder: 'e.g. Delhi Public School' },
                { key: 'stopName',   label: 'Pickup Stop',    placeholder: 'e.g. Tower A Gate (optional)' },
              ].map(field => (
                <View key={field.key} style={{ marginBottom: SPACING.md }}>
                  <Text style={s.label}>{field.label}</Text>
                  <TextInput
                    style={s.input}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    value={(form as any)[field.key]}
                    onChangeText={v => { setForm(f => ({ ...f, [field.key]: v })); setFormErr(''); }}
                  />
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[s.submitBtn, registerMutation.isPending && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.submitBtnText}>Register Child</Text>
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
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.12)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerAddBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },

  liveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },
  liveText: { fontSize: 13, fontWeight: '700', color: '#92400E', fontFamily: 'Outfit-Bold' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  statusPillText: { fontSize: 11, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  etaText: { marginLeft: 'auto', fontSize: 12, fontWeight: '700', color: '#059669', fontFamily: 'Outfit-Bold' },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.1)' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabLabel: { fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium', fontWeight: '600' },
  tabLabelActive: { color: COLORS.primary, fontFamily: 'Outfit-Bold', fontWeight: '700' },

  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },

  childCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.sm,
  },
  childAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { fontSize: 20, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.primary },
  childName: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  childGrade: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  busChip: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5, backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  busChipText: { fontSize: 10, color: '#D97706', fontFamily: 'DMSans-Medium', fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  tripRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(99,102,241,0.1)', ...SHADOWS.sm,
  },
  tripIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tripLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  tripDate: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  tripTime: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'monospace' },
  tripBadge: { marginTop: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  tripBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 30, fontFamily: 'DMSans-Regular', lineHeight: 18 },
  emptyBtn: { marginTop: SPACING.md, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.md, ...SHADOWS.sm },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 5, fontFamily: 'DMSans-Medium' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular' },
  submitBtn: { backgroundColor: '#D97706', paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.md, ...SHADOWS.sm },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
  successBanner: { backgroundColor: '#D1FAE5', borderRadius: RADIUS.md, padding: 12, marginBottom: SPACING.md },
  successBannerText: { color: '#065F46', fontWeight: '700', fontSize: 13 },
  errorBanner: { backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, padding: 12, marginBottom: SPACING.md },
  errorBannerText: { color: '#991B1B', fontWeight: '600', fontSize: 13 },
});
