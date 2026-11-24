import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/common/Header';
import { jobService } from '@/services/jobService';
import { JobCard, JOB_CATEGORY_META, JOB_TYPE_LABEL } from '@/components/jobs/JobCard';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { JobCategory, JobType } from '@/types/api';

const CATEGORIES: { key: JobCategory | 'ALL'; label: string; emoji: string }[] = [
  { key: 'ALL',          label: 'All',       emoji: '✨' },
  { key: 'HOME_REPAIRS', label: 'Repairs',   emoji: '🔧' },
  { key: 'CLEANING',     label: 'Cleaning',  emoji: '🧹' },
  { key: 'CHILDCARE',    label: 'Childcare', emoji: '👶' },
  { key: 'TUTORING',     label: 'Tutoring',  emoji: '🎓' },
  { key: 'PET_CARE',     label: 'Pet Care',  emoji: '🐾' },
  { key: 'TRANSPORT',    label: 'Transport', emoji: '🚗' },
  { key: 'TECH_HELP',    label: 'Tech Help', emoji: '💻' },
  { key: 'COOKING',      label: 'Cooking',   emoji: '🍳' },
  { key: 'FITNESS',      label: 'Fitness',   emoji: '💪' },
  { key: 'ERRANDS',      label: 'Errands',   emoji: '🛒' },
  { key: 'OTHER',        label: 'Other',     emoji: '💼' },
];

const JOB_TYPES: { key: JobType | 'ALL'; label: string }[] = [
  { key: 'ALL',       label: 'All types'  },
  { key: 'ONE_TIME',  label: 'One-time'   },
  { key: 'RECURRING', label: 'Recurring'  },
  { key: 'PART_TIME', label: 'Part-time'  },
  { key: 'FULL_TIME', label: 'Full-time'  },
];

export default function JobBoardScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<JobCategory | 'ALL'>('ALL');
  const [jobType,  setJobType]  = useState<JobType | 'ALL'>('ALL');
  const [search,   setSearch]   = useState('');

  const {
    data, isLoading, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey:        ['jobs', category, jobType, search],
    queryFn:         ({ pageParam = 0 }) => jobService.getJobs(
      category === 'ALL' ? undefined : category,
      jobType  === 'ALL' ? undefined : jobType,
      undefined,
      search.trim() || undefined,
      pageParam,
    ),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  });

  const jobs  = data?.pages.flatMap((p) => p.content) ?? [];
  const total = data?.pages[0]?.totalElements ?? 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <Header
        title="Job Board"
        subtitle="Community Tasks & Gigs"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
        actions={[
          {
            icon: 'briefcase-outline',
            onPress: () => router.push('/jobs/my-jobs'),
          },
          {
            icon: 'add-circle',
            onPress: () => router.push('/jobs/create'),
          },
        ]}
      />

      {/* Search Input Bar */}
      <View style={s.searchSection}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={17} color={COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search tasks, babysitting, tutors…"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={s.postShortcutBtn}
          onPress={() => router.push('/jobs/create')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={s.postShortcutText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills Strip */}
      <View style={s.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          {CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setCategory(c.key)}
                activeOpacity={0.8}
              >
                <Text style={s.chipEmoji}>{c.emoji}</Text>
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Secondary Filter: Job Type Ribbon */}
      <View style={s.typeWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.typeChips}
        >
          {JOB_TYPES.map((t) => {
            const active = jobType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.typeChip, active && s.typeChipActive]}
                onPress={() => setJobType(t.key)}
                activeOpacity={0.8}
              >
                <Text style={[s.typeText, active && s.typeTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Result Count Strip */}
      <View style={s.countRow}>
        <Text style={s.resultCount}>
          {total > 0
            ? `${total} ${total === 1 ? 'Opportunity' : 'Opportunities'} available`
            : 'Explore community opportunities'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/jobs/my-jobs')}
          style={s.myJobsLink}
        >
          <Ionicons name="folder-outline" size={13} color={COLORS.primary} />
          <Text style={s.myJobsLinkText}>My Postings</Text>
        </TouchableOpacity>
      </View>

      {/* Job Cards List */}
      {isLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadingText}>Fetching community job board...</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
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
              refreshing={isRefetching}
              onRefresh={() => { refetch(); }}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ padding: 16 }} color={COLORS.primary} />
            ) : undefined
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="briefcase-outline" size={38} color="#6366F1" />
              </View>
              <Text style={s.emptyTitle}>No Opportunities Found</Text>
              <Text style={s.emptySub}>
                {search
                  ? `No matching listings for "${search}". Try adjusting filters.`
                  : 'Be the first resident to post a task or gig for your neighbors.'}
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push('/jobs/create')}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={s.emptyBtnText}>Post a Job</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── Search & Actions Bar ──────────────────────────────────────────
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    fontFamily: FONTS.regular,
  },
  postShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 40,
    gap: 4,
    ...SHADOWS.sm,
  },
  postShortcutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: FONTS.bold,
  },

  // ── Category Pills ────────────────────────────────────────────────
  chipsWrap: {
    backgroundColor: '#FFFFFF',
  },
  chips: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  chipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },

  // ── Job Type Strip ────────────────────────────────────────────────
  typeWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  typeChips: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  typeChipActive: {
    backgroundColor: COLORS.primary,
  },
  typeText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  typeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },

  // ── Count & Quick Links ───────────────────────────────────────────
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  resultCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  myJobsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  myJobsLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },

  // ── List & Empty States ───────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  itemWrap: {
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

