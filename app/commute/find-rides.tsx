import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { commuteService } from '@/services/commuteService';
import { RideCard } from '@/components/commute/RideCard';
import { COLORS } from '@/constants/config';
import type { CommuteRideType } from '@/types/api';

const FILTERS: { label: string; value: CommuteRideType | undefined }[] = [
  { label: 'All',      value: undefined },
  { label: 'Offers',   value: 'OFFER' },
  { label: 'Requests', value: 'REQUEST' },
];

export default function FindRidesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<CommuteRideType | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const isSearching = search.trim().length > 0;

  const { data: browsePage, isLoading: loadingBrowse } = useQuery({
    queryKey: ['commute-browse', filter, page],
    queryFn:  () => commuteService.getUpcomingRides(filter, page),
    enabled:  !isSearching,
  });

  const { data: searchPage, isLoading: loadingSearch } = useQuery({
    queryKey: ['commute-search', search, page],
    queryFn:  () => commuteService.searchRides(search.trim(), page),
    enabled:  isSearching,
  });

  const rides = isSearching
    ? (searchPage?.content ?? [])
    : (browsePage?.content ?? []);
  const isLoading = isSearching ? loadingSearch : loadingBrowse;

  const handleLoadMore = useCallback(() => {
    const total = isSearching ? searchPage?.totalPages : browsePage?.totalPages;
    if (total && page < total - 1) setPage(p => p + 1);
  }, [page, browsePage, searchPage, isSearching]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Find Rides</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Search by destination..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(0); }}
        />
      </View>

      {/* Filter chips */}
      {!isSearching && (
        <View style={s.filtersRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.label}
              style={[s.chip, filter === f.value && s.chipActive]}
              onPress={() => { setFilter(f.value); setPage(0); }}
            >
              <Text style={[s.chipText, filter === f.value && s.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading && page === 0 ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <RideCard ride={item} />}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>
                {isSearching ? 'No rides found for this destination.' : 'No upcoming rides available.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn:        { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  headerTitle:    { fontSize: 18, fontWeight: '700', color: COLORS.text },
  searchWrap:     { paddingHorizontal: 16, paddingTop: 12 },
  searchInput:    { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  filtersRow:     { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  chip:           { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  chipTextActive: { color: '#FFF' },
  list:           { padding: 16 },
  empty:          { padding: 40, alignItems: 'center' },
  emptyText:      { color: COLORS.textMuted, fontSize: 14 },
});
