import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { jobService } from '@/services/jobService';
import { JobCard } from '@/components/jobs/JobCard';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { JobApplicationDto } from '@/types/api';

type Tab = 'POSTED' | 'APPLIED';

const APP_STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING:  { label: 'Pending Review', bg: '#EEF2FF', color: COLORS.primary, border: '#C7D2FE' },
  ACCEPTED: { label: 'Accepted',       bg: '#ECFDF5', color: '#059669',     border: '#A7F3D0' },
  REJECTED: { label: 'Not Selected',   bg: '#FEF2F2', color: '#DC2626',     border: '#FECACA' },
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
      <View style={ac.topRow}>
        <View style={ac.jobTitleGroup}>
          <Text style={ac.jobTitle}>Job #{app.jobId}</Text>
          <Text style={ac.appliedDate}>
            Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
          </Text>
        </View>

        <View style={[ac.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Text style={[ac.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <Text style={ac.message} numberOfLines={2}>{app.coverMessage}</Text>

      <View style={ac.footerRow}>
        <Text style={ac.viewDetailsText}>View Job Details</Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );
}

const ac = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 8,
    ...SHADOWS.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobTitleGroup: {
    flex: 1,
    gap: 2,
  },
  jobTitle: {
    fontSize: 14.5,
    fontFamily: FONTS.displayBold,
    fontWeight: '700',
    color: '#0F172A',
  },
  appliedDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: FONTS.regular,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  message: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    fontFamily: FONTS.regular,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
});

export default function MyJobsScreen() {
  const router = useRouter();
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

  const postedJobs   = postedData?.pages.flatMap((p) => p.content) ?? [];
  const applications = appliedData?.pages.flatMap((p) => p.content) ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <Header
        title="My Jobs & Applications"
        subtitle="Manage your community opportunities"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
        actions={[
          {
            icon: 'add-circle',
            onPress: () => router.push('/jobs/create'),
          },
        ]}
      />

      {/* Segmented Tab Bar */}
      <View style={s.tabBarContainer}>
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tabItem, tab === 'POSTED' && s.tabItemActive]}
            onPress={() => setTab('POSTED')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="briefcase-outline"
              size={15}
              color={tab === 'POSTED' ? COLORS.primary : '#64748B'}
            />
            <Text
              style={[s.tabText, tab === 'POSTED' && s.tabTextActive]}
            >
              My Postings ({postedJobs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tabItem, tab === 'APPLIED' && s.tabItemActive]}
            onPress={() => setTab('APPLIED')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="paper-plane-outline"
              size={15}
              color={tab === 'APPLIED' ? COLORS.primary : '#64748B'}
            />
            <Text
              style={[s.tabText, tab === 'APPLIED' && s.tabTextActive]}
            >
              Applied ({applications.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Posted jobs tab */}
      {tab === 'POSTED' && (
        loadingPosted ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={s.loadingText}>Loading your postings...</Text>
          </View>
        ) : (
          <FlatList
            data={postedJobs}
            keyExtractor={(j) => String(j.id)}
            renderItem={({ item }) => (
              <View style={s.itemWrap}>
                <JobCard job={item} />
              </View>
            )}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refetchingPosted}
                onRefresh={() => { refetchPosted(); }}
                tintColor={COLORS.primary}
              />
            }
            onEndReached={() => hasMorePosted && fetchMorePosted()}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              <View style={s.empty}>
                <View style={s.emptyIconCircle}>
                  <Ionicons name="clipboard-outline" size={38} color="#6366F1" />
                </View>
                <Text style={s.emptyTitle}>No Jobs Posted Yet</Text>
                <Text style={s.emptySub}>
                  Need help with repairs, tutoring, or pet care? Post a listing to reach your neighbors.
                </Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => router.push('/jobs/create')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                  <Text style={s.emptyBtnText}>Post your first Job</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )
      )}

      {/* Applied jobs tab */}
      {tab === 'APPLIED' && (
        loadingApplied ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={s.loadingText}>Loading your applications...</Text>
          </View>
        ) : (
          <FlatList
            data={applications}
            keyExtractor={(a) => String(a.id)}
            renderItem={({ item }) => <ApplicationCard app={item} />}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refetchingApplied}
                onRefresh={() => { refetchApplied(); }}
                tintColor={COLORS.primary}
              />
            }
            onEndReached={() => hasMoreApplied && fetchMoreApplied()}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              <View style={s.empty}>
                <View style={s.emptyIconCircle}>
                  <Ionicons name="mail-unread-outline" size={38} color="#6366F1" />
                </View>
                <Text style={s.emptyTitle}>No Applications Yet</Text>
                <Text style={s.emptySub}>
                  Browse community opportunities and offer your skills to neighbors in need.
                </Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => router.push('/jobs')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                  <Text style={s.emptyBtnText}>Browse Open Jobs</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
  tabText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  listContent: {
    paddingVertical: 10,
    paddingBottom: 40,
  },
  itemWrap: {
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  loadingBox: {
    marginTop: 80,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: FONTS.medium,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: FONTS.displayBold,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: FONTS.regular,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 10,
    ...SHADOWS.sm,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
    fontFamily: FONTS.bold,
  },
});

