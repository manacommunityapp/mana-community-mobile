import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { COLORS } from '@/constants/config';
import { format } from 'date-fns';
import type { AdminMemberDto } from '@/types/api';

type Tab = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'PENDING',   label: 'Pending',   emoji: '⏳' },
  { key: 'ACTIVE',    label: 'Active',    emoji: '✅' },
  { key: 'SUSPENDED', label: 'Suspended', emoji: '🚫' },
];

// ── Member row ─────────────────────────────────────────────────
function MemberCard({
  member,
  tab,
  onApprove,
  onReject,
  onSuspend,
  onActivate,
}: {
  member:     AdminMemberDto;
  tab:        Tab;
  onApprove:  (m: AdminMemberDto) => void;
  onReject:   (m: AdminMemberDto) => void;
  onSuspend:  (m: AdminMemberDto) => void;
  onActivate: (m: AdminMemberDto) => void;
}) {
  return (
    <View style={mc.card}>
      {/* Avatar + info */}
      <View style={mc.row}>
        <View style={mc.avatar}>
          <Text style={mc.avatarText}>{member.name[0]}</Text>
        </View>
        <View style={mc.info}>
          <Text style={mc.name}>{member.name}</Text>
          <Text style={mc.email} numberOfLines={1}>{member.email}</Text>
          <View style={mc.tagRow}>
            {member.flatNumber && <Text style={mc.tag}>🏠 {member.flatNumber}</Text>}
            {member.tower      && <Text style={mc.tag}>🏢 {member.tower}</Text>}
            {member.mobile     && <Text style={mc.tag}>📱 {member.mobile}</Text>}
          </View>
          <Text style={mc.date}>
            {tab === 'PENDING'
              ? `Requested ${format(new Date(member.joinedAt), 'dd MMM yyyy')}`
              : tab === 'SUSPENDED'
              ? `Suspended member`
              : `Joined ${format(new Date(member.joinedAt), 'dd MMM yyyy')}`
            }
          </Text>
        </View>
        <View style={[mc.roleBadge, member.role === 'ADMIN' && mc.roleBadgeAdmin]}>
          <Text style={[mc.roleText, member.role === 'ADMIN' && mc.roleTextAdmin]}>
            {member.role}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={mc.actions}>
        {tab === 'PENDING' && (
          <>
            <TouchableOpacity
              style={[mc.btn, mc.btnSuccess]}
              onPress={() => onApprove(member)}
            >
              <Text style={mc.btnTextLight}>✓ Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[mc.btn, mc.btnDanger]}
              onPress={() => onReject(member)}
            >
              <Text style={mc.btnTextLight}>✕ Reject</Text>
            </TouchableOpacity>
          </>
        )}
        {tab === 'ACTIVE' && (
          <TouchableOpacity
            style={[mc.btn, mc.btnWarning]}
            onPress={() => onSuspend(member)}
          >
            <Text style={mc.btnTextDark}>⏸ Suspend</Text>
          </TouchableOpacity>
        )}
        {tab === 'SUSPENDED' && (
          <TouchableOpacity
            style={[mc.btn, mc.btnSuccess]}
            onPress={() => onActivate(member)}
          >
            <Text style={mc.btnTextLight}>▶ Activate</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const mc = StyleSheet.create({
  card:          { backgroundColor: COLORS.surface, marginHorizontal: 12, marginVertical: 5, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  row:           { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:    { color: '#fff', fontWeight: '700', fontSize: 18 },
  info:          { flex: 1, gap: 3 },
  name:          { fontSize: 15, fontWeight: '700', color: COLORS.text },
  email:         { fontSize: 12, color: COLORS.textMuted },
  tagRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag:           { fontSize: 11, color: COLORS.primary, backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  date:          { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  roleBadge:     { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  roleBadgeAdmin:{ backgroundColor: '#FEF3C7' },
  roleText:      { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  roleTextAdmin: { color: '#92400E' },
  actions:       { flexDirection: 'row', gap: 10 },
  btn:           { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  btnSuccess:    { backgroundColor: COLORS.success },
  btnDanger:     { backgroundColor: COLORS.error },
  btnWarning:    { backgroundColor: COLORS.warning },
  btnTextLight:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnTextDark:   { color: '#fff', fontWeight: '700', fontSize: 13 },
});

// ── Screen ─────────────────────────────────────────────────────
export default function MembersScreen() {
  const router  = useRouter();
  const qc      = useQueryClient();
  const [tab,    setTab]    = useState<Tab>('PENDING');
  const [search, setSearch] = useState('');

  const {
    data, isLoading, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['admin-members', tab, search],
    queryFn:  ({ pageParam = 0 }) =>
      adminService.getMembers(tab, pageParam, search || undefined),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  });

  const members = data?.pages.flatMap((p) => p.content) ?? [];
  const total   = data?.pages[0]?.totalElements ?? 0;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-members'] });

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminService.approveMember(id),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      adminService.rejectMember(id, reason),
    onSuccess: invalidate,
  });
  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      adminService.suspendMember(id, reason),
    onSuccess: invalidate,
  });
  const activateMutation = useMutation({
    mutationFn: (id: number) => adminService.activateMember(id),
    onSuccess: invalidate,
  });

  const handleApprove = useCallback((m: AdminMemberDto) => {
    Alert.alert('Approve Member', `Approve ${m.name} to join the community?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', style: 'default',
        onPress: () => approveMutation.mutate(m.id) },
    ]);
  }, [approveMutation]);

  const handleReject = useCallback((m: AdminMemberDto) => {
    Alert.alert('Reject Member', `Reject ${m.name}'s request?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive',
        onPress: () => rejectMutation.mutate({ id: m.id }) },
    ]);
  }, [rejectMutation]);

  const handleSuspend = useCallback((m: AdminMemberDto) => {
    Alert.prompt(
      'Suspend Member',
      `Reason for suspending ${m.name}? (optional)`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Suspend', style: 'destructive',
          onPress: (reason) => suspendMutation.mutate({ id: m.id, reason }) },
      ],
    );
  }, [suspendMutation]);

  const handleActivate = useCallback((m: AdminMemberDto) => {
    Alert.alert('Activate Member', `Re-activate ${m.name}'s account?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Activate', onPress: () => activateMutation.mutate(m.id) },
    ]);
  }, [activateMutation]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AdminMemberDto>) => (
      <MemberCard
        member={item} tab={tab}
        onApprove={handleApprove} onReject={handleReject}
        onSuspend={handleSuspend} onActivate={handleActivate}
      />
    ),
    [tab, handleApprove, handleReject, handleSuspend, handleActivate],
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Members</Text>
        <Text style={s.count}>{total} total</Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          placeholder="Search by name, flat, email…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>
              {t.emoji} {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator style={{ padding: 16 }} color={COLORS.primary} />
              : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>{tab === 'PENDING' ? '🎉' : tab === 'SUSPENDED' ? '✅' : '👥'}</Text>
              <Text style={s.emptyText}>
                {tab === 'PENDING' ? 'No pending requests' :
                 tab === 'SUSPENDED' ? 'No suspended members' :
                 'No members found'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:        { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:       { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  count:       { fontSize: 13, color: COLORS.textMuted },
  searchWrap:  { backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8 },
  search:      { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  tabs:        { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:   { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText:     { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji:  { fontSize: 48 },
  emptyText:   { fontSize: 16, color: COLORS.textMuted },
});
