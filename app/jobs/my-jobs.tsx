import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { jobService } from '@/services/jobService';
import { JobCard } from '@/components/jobs/JobCard';
import { COLORS } from '@/constants/config';
import type { JobApplicationDto } from '@/types/api';

type Tab = 'POSTED' | 'APPLIED';

const APP_STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:  { label: '⏳ Pending',  bg: '#EEF2FF', color: COLORS.primary  },
  ACCEPTED: { label: '✅ Accepted', bg: '#D1FAE5', color: '#065F46'       },
  REJECTED: { label: '❌ Rejected', bg: '#FEE2E2', color: COLORS.error    },
};

function ApplicationCard({ app }: { app: JobApplicationDto }) {
  const router = useRouter();
  const badge  = APP_STATUS_STYLE[app.status] ?? APP_STATUS_STYLE.PENDING;

  return (
    <TouchableOpacity
      style={ac.card}
      onPress={() => router.push(`/jobs/${app.jobId}`)}
      activeOpacity={0.85}
    >
      <View style={ac.row}>
        <View style={{ flex: 1 }}>
          <Text style={ac.jobTitle}>Job #{app.jobId}</Text>
          <Text style={ac.message} numberOfLines={2}>{app.coverMessage}</Text>
          <Text style={ac.time}>
            Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
          </Text>
        </View>
        <View style={[ac.badge, { backgroundColor: badge.bg }]}>
          <Text style={[ac.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const ac = StyleSheet.create({
  card:      { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 12, marginVertical: 5 },
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  jobTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  message:   { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  time:      { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  badge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, alignSelf: 'flex-start', flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

export default function MyJobsScreen() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [tab, setTab] = useState<Tab>('POSTED');

  // My posted jobs
  const {
    data: postedData, isLoading: loadingPosted,
    refetch: refetchPosted, isRefetching: refetchingPosted,
    fetchNextPage: fetchMorePosted, hasNextPage: hasMorePosted,
  } = useInfiniteQuery({
    queryKey:        ['jobs-mine'],
    queryFn:         ({ pageParam = 0 }) => jobService.getMyPostedJobs(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
    enabled: tab === 'POSTED',
  });

  // My applications
  const {
    data: appliedData, isLoading: loadingApplied,
    refetch: refetchApplied, isRefetching: refetchingApplied,
    fetchNextPage: fetchMoreApplied, hasNextPage: hasMoreApplied,
  } = useInfiniteQuery({
    queryKey:        ['jobs-applied'],
    queryFn:         ({ pageParam = 0 }) => jobService.getMyApplications(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
    enabled: tab === 'APPLIED',
  });

  const postedJobs  = postedData?.pages.flatMap((p) => p.content) ?? [];
  const applications = appliedData?.pages.flatMap((p) => p.content) ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>My Jobs</Text>
        <TouchableOpacity style={s.postBtn} onPress={() => router.push('/jobs/create')}>
          <Text style={s.postBtnText}>+ Post</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['POSTED', 'APPLIED'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'POSTED' ? '📋 My Postings' : '📨 Applications'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Posted jobs */}
      {tab === 'POSTED' && (
        loadingPosted
          ? <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
          : <FlatList
              data={postedJobs}
              keyExtractor={(j) => String(j.id)}
              renderItem={({ item }) => (
                <View style={{ paddingHorizontal: 12, marginVertical: 5 }}>
                  <JobCard job={item} />
                </View>
              )}
              contentContainerStyle={{ paddingVertical: 8 }}
              refreshControl={
                <RefreshControl refreshing={refetchingPosted} onRefresh={refetchPosted} tintColor={COLORS.primary} />
              }
              onEndReached={() => hasMorePosted && fetchMorePosted()}
              onEndReachedThreshold={0.4}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={s.emptyEmoji}>📋</Text>
                  <Text style={s.emptyTitle}>No jobs posted yet</Text>
                  <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/jobs/create')}>
                    <Text style={s.emptyBtnText}>Post your first job</Text>
                  </TouchableOpacity>
                </View>
              }
            />
      )}

      {/* Applications */}
      {tab === 'APPLIED' && (
        loadingApplied
          ? <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
          : <FlatList
              data={applications}
              keyExtractor={(a) => String(a.id)}
              renderItem={({ item }) => <ApplicationCard app={item} />}
              contentContainerStyle={{ paddingVertical: 8 }}
              refreshControl={
                <RefreshControl refreshing={refetchingApplied} onRefresh={refetchApplied} tintColor={COLORS.primary} />
              }
              onEndReached={() => hasMoreApplied && fetchMoreApplied()}
              onEndReachedThreshold={0.4}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={s.emptyEmoji}>📨</Text>
                  <Text style={s.emptyTitle}>No applications yet</Text>
                  <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/jobs')}>
                    <Text style={s.emptyBtnText}>Browse open jobs</Text>
                  </TouchableOpacity>
                </View>
              }
            />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:            { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:           { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  postBtn:         { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  postBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  tabs:            { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:             { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:       { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabText:         { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  tabTextActive:   { color: COLORS.primary, fontWeight: '700' },
  empty:           { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji:      { fontSize: 52 },
  emptyTitle:      { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptyBtn:        { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});
