import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { jobService } from '@/services/jobService';
import { JobCard, JOB_CATEGORY_META, JOB_TYPE_LABEL } from '@/components/jobs/JobCard';
import { COLORS } from '@/constants/config';
import type { JobCategory, JobType } from '@/types/api';

const CATEGORIES: { key: JobCategory | 'ALL'; label: string }[] = [
  { key: 'ALL',         label: 'All'         },
  { key: 'HOME_REPAIRS',label: '🔧 Repairs'  },
  { key: 'CLEANING',    label: '🧹 Cleaning' },
  { key: 'CHILDCARE',   label: '👶 Childcare'},
  { key: 'TUTORING',    label: '🎓 Tutoring' },
  { key: 'PET_CARE',    label: '🐾 Pets'     },
  { key: 'TRANSPORT',   label: '🚗 Transport'},
  { key: 'TECH_HELP',   label: '💻 Tech'     },
  { key: 'COOKING',     label: '🍳 Cooking'  },
  { key: 'FITNESS',     label: '💪 Fitness'  },
  { key: 'ERRANDS',     label: '🛒 Errands'  },
  { key: 'OTHER',       label: '💼 Other'    },
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
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Job Board</Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.myJobsBtn} onPress={() => router.push('/jobs/my-jobs')}>
            <Text style={s.myJobsBtnText}>My Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.postBtn} onPress={() => router.push('/jobs/create')}>
            <Text style={s.postBtnText}>+ Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search jobs…"
          placeholderTextColor={COLORS.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
        style={s.chipsWrap}
      >
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[s.chip, category === c.key && s.chipActive]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[s.chipText, category === c.key && s.chipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Job type filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.typeChips}
        style={s.typeWrap}
      >
        {JOB_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.typeChip, jobType === t.key && s.typeChipActive]}
            onPress={() => setJobType(t.key)}
          >
            <Text style={[s.typeText, jobType === t.key && s.typeTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count */}
      {total > 0 && (
        <Text style={s.resultCount}>{total} job{total !== 1 ? 's' : ''} found</Text>
      )}

      {/* List */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(j) => String(j.id)}
          renderItem={({ item }) => (
            <View style={s.itemWrap}>
              <JobCard job={item} />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
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
              <Text style={s.emptyEmoji}>💼</Text>
              <Text style={s.emptyTitle}>No jobs posted yet</Text>
              <Text style={s.emptySub}>
                {search
                  ? `No results for "${search}"`
                  : 'Be the first to post a job in your community.'}
              </Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/jobs/create')}>
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
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:            { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:           { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  headerRight:     { flexDirection: 'row', gap: 8 },
  myJobsBtn:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  myJobsBtnText:   { fontSize: 13, fontWeight: '600', color: COLORS.text },
  postBtn:         { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  postBtnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchWrap:      { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  search:          { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: COLORS.text },
  chipsWrap:       { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chips:           { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  chipActive:      { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  chipText:        { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive:  { color: COLORS.primary, fontWeight: '700' },
  typeWrap:        { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  typeChips:       { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  typeChip:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F3F4F6' },
  typeChipActive:  { backgroundColor: COLORS.primary },
  typeText:        { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  typeTextActive:  { color: '#fff', fontWeight: '700' },
  resultCount:     { fontSize: 12, color: COLORS.textMuted, paddingHorizontal: 16, paddingTop: 10 },
  itemWrap:        { paddingHorizontal: 12, marginVertical: 5 },
  empty:           { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji:      { fontSize: 52 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub:        { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn:        { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});
