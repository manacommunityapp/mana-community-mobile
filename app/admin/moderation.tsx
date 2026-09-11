import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { COLORS } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';
import type { ReportDto } from '@/types/api';

type FilterTab = 'PENDING' | 'RESOLVED' | 'DISMISSED';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'PENDING',   label: '🔴 Pending'  },
  { key: 'RESOLVED',  label: '✅ Resolved' },
  { key: 'DISMISSED', label: '🚫 Dismissed' },
];

function reasonColor(reason: string): string {
  if (reason.includes('spam') || reason.includes('SPAM'))          return '#F59E0B';
  if (reason.includes('abuse') || reason.includes('ABUSE'))        return '#EF4444';
  if (reason.includes('hate') || reason.includes('HATE'))          return '#DC2626';
  if (reason.includes('inappropriate'))                             return '#F97316';
  return COLORS.textMuted;
}

function ReportCard({
  report,
  onRemove,
  onResolve,
  onDismiss,
}: {
  report:    ReportDto;
  onRemove:  (r: ReportDto) => void;
  onResolve: (r: ReportDto) => void;
  onDismiss: (r: ReportDto) => void;
}) {
  return (
    <View style={rc.card}>
      {/* Header row */}
      <View style={rc.topRow}>
        <View style={[rc.typeBadge, { backgroundColor: report.targetType === 'POST' ? '#EEF2FF' : '#FEF3C7' }]}>
          <Text style={rc.typeText}>{report.targetType === 'POST' ? '📝 Post' : report.targetType === 'COMMENT' ? '💬 Comment' : '👤 User'}</Text>
        </View>
        <Text style={[rc.reason, { color: reasonColor(report.reason) }]}>
          {report.reason}
        </Text>
        <Text style={rc.time}>
          {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
        </Text>
      </View>

      {/* Reported content */}
      {report.targetContent && (
        <View style={rc.contentBox}>
          <Text style={rc.contentAuthor}>By {report.targetAuthor ?? 'Unknown'}</Text>
          <Text style={rc.contentText} numberOfLines={3}>{report.targetContent}</Text>
        </View>
      )}

      {/* Reporter */}
      <Text style={rc.reporter}>
        🚩 Reported by <Text style={rc.reporterName}>{report.reporterName}</Text>
      </Text>

      {/* Actions — only for pending */}
      {report.status === 'PENDING' && (
        <View style={rc.actions}>
          {report.targetType !== 'USER' && (
            <TouchableOpacity style={[rc.btn, rc.btnDanger]} onPress={() => onRemove(report)}>
              <Text style={rc.btnText}>🗑 Remove Content</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[rc.btn, rc.btnSuccess]} onPress={() => onResolve(report)}>
            <Text style={rc.btnText}>✓ Resolve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[rc.btn, rc.btnNeutral]} onPress={() => onDismiss(report)}>
            <Text style={[rc.btnText, { color: COLORS.text }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const rc = StyleSheet.create({
  card:          { backgroundColor: COLORS.surface, marginHorizontal: 12, marginVertical: 5, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.border },
  topRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeText:      { fontSize: 12, fontWeight: '600', color: COLORS.text },
  reason:        { fontSize: 12, fontWeight: '700', flex: 1 },
  time:          { fontSize: 11, color: COLORS.textMuted },
  contentBox:    { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: COLORS.border, gap: 3 },
  contentAuthor: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  contentText:   { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  reporter:      { fontSize: 12, color: COLORS.textMuted },
  reporterName:  { fontWeight: '600', color: COLORS.text },
  actions:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn:           { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  btnDanger:     { backgroundColor: COLORS.error },
  btnSuccess:    { backgroundColor: COLORS.success },
  btnNeutral:    { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  btnText:       { color: '#fff', fontWeight: '700', fontSize: 13 },
});

// ── Screen ─────────────────────────────────────────────────────
export default function ModerationScreen() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [tab, setTab] = useState<FilterTab>('PENDING');

  const {
    data, isLoading, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['admin-reports', tab],
    queryFn:  ({ pageParam = 0 }) => adminService.getReports(tab, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  });

  const reports = data?.pages.flatMap((p) => p.content) ?? [];
  const total   = data?.pages[0]?.totalElements ?? 0;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-reports'] });

  const removeMutation  = useMutation({ mutationFn: ({ type, id }: { type: 'POST' | 'COMMENT'; id: number }) => adminService.removeContent(type, id), onSuccess: invalidate });
  const resolveMutation = useMutation({ mutationFn: adminService.resolveReport, onSuccess: invalidate });
  const dismissMutation = useMutation({ mutationFn: adminService.dismissReport, onSuccess: invalidate });

  const handleRemove = useCallback((r: ReportDto) => {
    Alert.alert(
      'Remove Content',
      `Permanently delete this ${r.targetType.toLowerCase()} and resolve the report?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove & Resolve', style: 'destructive', onPress: () => {
          removeMutation.mutate({ type: r.targetType as 'POST' | 'COMMENT', id: r.targetId });
          resolveMutation.mutate(r.id);
        }},
      ],
    );
  }, [removeMutation, resolveMutation]);

  const handleResolve = useCallback((r: ReportDto) => {
    Alert.alert('Resolve Report', 'Mark this report as resolved (no content removed)?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resolve', onPress: () => resolveMutation.mutate(r.id) },
    ]);
  }, [resolveMutation]);

  const handleDismiss = useCallback((r: ReportDto) => {
    Alert.alert('Dismiss Report', 'Dismiss this report as not violating guidelines?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Dismiss', onPress: () => dismissMutation.mutate(r.id) },
    ]);
  }, [dismissMutation]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ReportDto>) => (
      <ReportCard report={item} onRemove={handleRemove} onResolve={handleResolve} onDismiss={handleDismiss} />
    ),
    [handleRemove, handleResolve, handleDismiss],
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Moderation</Text>
        {tab === 'PENDING' && total > 0 && (
          <View style={s.badge}><Text style={s.badgeText}>{total}</Text></View>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => String(r.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={COLORS.primary} /> : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>{tab === 'PENDING' ? '🎉' : '📋'}</Text>
              <Text style={s.emptyText}>
                {tab === 'PENDING' ? 'No pending reports — community is clean!' : `No ${tab.toLowerCase()} reports`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:          { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:         { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  badge:         { backgroundColor: COLORS.error, borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText:     { color: '#fff', fontSize: 12, fontWeight: '800' },
  tabs:          { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:           { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText:       { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  empty:         { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji:    { fontSize: 48 },
  emptyText:     { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
