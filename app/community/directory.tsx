import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, SectionList,
  ActivityIndicator, TextInput, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { directoryService, ResidentEntry } from '@/services/directoryService';

const BLOCK_COLORS: Record<string, string> = {
  'Tower A': '#7C3AED',
  'Tower B': '#2563EB',
  'Tower C': '#D97706',
  'Tower D': '#059669',
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getBlockColor(block: string) {
  return BLOCK_COLORS[block] ?? COLORS.primary;
}

export default function DirectoryScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeBlock, setActiveBlock] = useState('All');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: raw, isLoading } = useQuery<ResidentEntry[]>({
    queryKey: ['directory', debouncedSearch, activeBlock === 'All' ? undefined : activeBlock],
    queryFn: () => directoryService.getDirectory(
      debouncedSearch || undefined,
      activeBlock === 'All' ? undefined : activeBlock
    ),
    staleTime: 60_000,
  });

  const allResidents = raw ?? [];

  const filtered = allResidents.filter(r => {
    const matchSearch = !debouncedSearch ||
      r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      r.flatNumber.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchBlock = activeBlock === 'All' || r.block === activeBlock;
    return matchSearch && matchBlock;
  });

  const blocks = ['All', ...Array.from(new Set(allResidents.map(r => r.block))).sort()];

  // Build sections for "All" view
  const sections = activeBlock === 'All'
    ? blocks
        .filter(b => b !== 'All')
        .map(b => ({
          title: b,
          data: filtered.filter(r => r.block === b),
        }))
        .filter(s => s.data.length > 0)
    : [];

  const handlePhonePress = (item: ResidentEntry) => {
    if (!item.phone) return;
    Linking.openURL('tel:' + item.phone);
  };

  const renderResidentCard = (item: ResidentEntry) => {
    const blockColor = getBlockColor(item.block);
    const isOwner = item.residentType === 'OWNER';
    return (
      <View key={String(item.id)} style={s.card}>
        <View style={[s.avatar, { backgroundColor: blockColor + '20' }]}>
          <Text style={[s.avatarText, { color: blockColor }]}>{getInitials(item.name)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <View style={s.nameRow}>
            <Text style={s.residentName}>{item.name}</Text>
            {item.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginLeft: 4 }} />
            )}
          </View>
          <View style={s.metaRow}>
            <View style={[s.flatChip, { backgroundColor: blockColor + '15' }]}>
              <Text style={[s.flatText, { color: blockColor }]}>{item.flatNumber}</Text>
            </View>
            <View style={[s.typeBadge, { backgroundColor: isOwner ? '#D1FAE5' : '#FEF3C7' }]}>
              <Text style={[s.typeText, { color: isOwner ? '#059669' : '#D97706' }]}>
                {isOwner ? 'Owner' : 'Tenant'}
              </Text>
            </View>
            {item.familySize && (
              <View style={s.familyChip}>
                <Ionicons name="people-outline" size={10} color={COLORS.textMuted} />
                <Text style={s.familyText}>{item.familySize}</Text>
              </View>
            )}
          </View>
        </View>
        {item.phone && (
          <TouchableOpacity onPress={() => handlePhonePress(item)} style={s.callBtn} hitSlop={8}>
            <Ionicons name="call-outline" size={17} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Resident Directory</Text>
          <Text style={s.headerSub}>{filtered.length} residents</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or flat number..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Block filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.blockScroll}
        style={s.blockScrollContainer}
      >
        {blocks.map(b => {
          const active = activeBlock === b;
          const color = b === 'All' ? COLORS.primary : getBlockColor(b);
          return (
            <TouchableOpacity
              key={b}
              style={[s.blockChip, active && { backgroundColor: color, borderColor: color }]}
              onPress={() => setActiveBlock(b)}
            >
              <Text style={[s.blockChipText, active && { color: '#fff' }]}>{b}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : activeBlock === 'All' && !debouncedSearch ? (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => renderResidentCard(item)}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: getBlockColor(section.title) }]} />
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={s.sectionCount}>{section.data.length} flats</Text>
            </View>
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyTitle}>No residents found</Text></View>}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => renderResidentCard(item)}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="search-outline" size={40} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No residents found</Text>
            </View>
          }
        />
      )}
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.08)',
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans-Regular', paddingVertical: 0 },

  blockScrollContainer: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.08)' },
  blockScroll: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: 8 },
  blockChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  blockChipText: { fontSize: 13, fontFamily: 'DMSans-Medium', fontWeight: '600', color: COLORS.textSecondary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SPACING.md, paddingBottom: 40 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: SPACING.sm, marginBottom: 4, marginTop: SPACING.sm },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold', flex: 1 },
  sectionCount: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.12)', ...SHADOWS.sm,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontFamily: 'Outfit-Bold', fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  residentName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  metaRow: { flexDirection: 'row', gap: 5, marginTop: 4, flexWrap: 'wrap' },
  flatChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  flatText: { fontSize: 11, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  typeText: { fontSize: 11, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  familyChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3F4F6', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  familyText: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  callBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyTitle: { fontSize: 15, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
});
