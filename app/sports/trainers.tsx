import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import { sportsTrainerService, SportsTrainerDto } from '@/services/sportsTrainerService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

const SPORTS = [
  { key: 'ALL',       label: 'All',        emoji: '🏅' },
  { key: 'Badminton', label: 'Badminton',  emoji: '🏸' },
  { key: 'Cricket',   label: 'Cricket',    emoji: '🏏' },
  { key: 'Tennis',    label: 'Tennis',     emoji: '🎾' },
  { key: 'Football',  label: 'Football',   emoji: '⚽' },
  { key: 'Basketball',label: 'Basketball', emoji: '🏀' },
  { key: 'Yoga',      label: 'Yoga',       emoji: '🧘' },
  { key: 'Fitness',   label: 'Fitness',    emoji: '💪' },
  { key: 'Swimming',  label: 'Swimming',   emoji: '🏊' },
  { key: 'Chess',     label: 'Chess',      emoji: '♟️' },
];

function sportEmoji(sport: string): string {
  return SPORTS.find(s => s.key.toLowerCase() === sport.toLowerCase())?.emoji ?? '🏅';
}

export default function TrainersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const communityId = (user as any)?.communityId ?? (user as any)?.community?.id;

  const [sportFilter, setSportFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data: trainers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey:  ['sports-trainers', communityId],
    queryFn:   () => sportsTrainerService.listApproved(communityId),
    enabled:   !!communityId,
    staleTime: 2 * 60 * 1000,
  });

  const filtered = trainers.filter(t => {
    const matchSport  = sportFilter === 'ALL' || t.sport.toLowerCase() === sportFilter.toLowerCase();
    const matchSearch = !search || t.fullName.toLowerCase().includes(search.toLowerCase()) ||
                        t.sport.toLowerCase().includes(search.toLowerCase());
    return matchSport && matchSearch;
  });

  const renderTrainer = useCallback(({ item }: { item: SportsTrainerDto }) => (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/sports/trainer/[id]', params: { id: item.id } })}
    >
      <View style={s.cardLeft}>
        {item.profilePicUrl ? (
          <Image source={{ uri: item.profilePicUrl }} style={s.avatar} contentFit="cover" />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarEmoji}>{sportEmoji(item.sport)}</Text>
          </View>
        )}
        {/* Slots badge */}
        <View style={s.sportBadge}>
          <Text style={s.sportBadgeText}>{item.sport}</Text>
        </View>
      </View>
      <View style={s.cardBody}>
        <Text style={s.name}>{item.fullName}</Text>
        {item.certBody && (
          <View style={s.certRow}>
            <Ionicons name="ribbon-outline" size={11} color={COLORS.primary} />
            <Text style={s.certText}>{item.certBody}</Text>
          </View>
        )}
        {item.bio ? (
          <Text style={s.bio} numberOfLines={2}>{item.bio}</Text>
        ) : null}
        <View style={s.metaRow}>
          {item.experienceYears ? (
            <View style={s.chip}>
              <Ionicons name="time-outline" size={10} color={COLORS.textMuted} />
              <Text style={s.chipText}>{item.experienceYears}y exp</Text>
            </View>
          ) : null}
          {item.ageGroupsCoached ? (
            <View style={s.chip}>
              <Ionicons name="people-outline" size={10} color={COLORS.textMuted} />
              <Text style={s.chipText}>{item.ageGroupsCoached}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} style={{ alignSelf: 'center' }} />
    </TouchableOpacity>
  ), [router]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Sports Trainers</Text>
          <Text style={s.headerSub}>{filtered.length} coach{filtered.length !== 1 ? 'es' : ''} available</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or sport…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sport filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersRow}
      >
        {SPORTS.map(sp => (
          <TouchableOpacity
            key={sp.key}
            style={[s.filterChip, sportFilter === sp.key && s.filterChipActive]}
            onPress={() => setSportFilter(sp.key)}
            activeOpacity={0.8}
          >
            <Text style={s.filterEmoji}>{sp.emoji}</Text>
            <Text style={[s.filterLabel, sportFilter === sp.key && s.filterLabelActive]}>
              {sp.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderTrainer}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🏅</Text>
              <Text style={s.emptyTitle}>No trainers found</Text>
              <Text style={s.emptySub}>
                {sportFilter !== 'ALL' ? `No ${sportFilter} coaches yet` : 'Check back soon'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerCenter:    { flex: 1, alignItems: 'center' },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerSub:       { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  searchRow:       {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.borderSlate,
    ...SHADOWS.sm,
  },
  searchInput:     { flex: 1, fontSize: 14, color: COLORS.text },
  filtersRow:      { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip:      {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.borderSlate,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterEmoji:     { fontSize: 13 },
  filterLabel:     { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterLabelActive: { color: '#fff' },
  list:            { paddingHorizontal: 16, paddingBottom: 24 },
  card:            {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, gap: 12,
    borderWidth: 1, borderColor: COLORS.borderSlate,
    ...SHADOWS.sm,
  },
  cardLeft:        { alignItems: 'center', gap: 6 },
  avatar:          { width: 56, height: 56, borderRadius: 14 },
  avatarFallback:  { backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji:     { fontSize: 24 },
  sportBadge:      {
    backgroundColor: COLORS.primaryLight, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  sportBadgeText:  { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  cardBody:        { flex: 1, gap: 3 },
  name:            { fontSize: 15, fontWeight: '700', color: COLORS.text },
  certRow:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  certText:        { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  bio:             { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  metaRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip:            {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.backgroundAlt, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  chipText:        { fontSize: 10, color: COLORS.textMuted },
  empty:           { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:      { fontSize: 48, marginBottom: 12 },
  emptyTitle:      { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub:        { fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
});
