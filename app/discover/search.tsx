import React, { useRef } from 'react';
import {
  View, Text, TextInput, FlatList, ActivityIndicator,
  TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SearchResultCard } from '@/components/discover/SearchResultCard';
import { ModuleFilterChips } from '@/components/discover/ModuleFilterChips';
import { useSearch } from '@/hooks/useSearch';
import { SearchResultDto, SearchModule } from '@/services/searchService';
import { MODULE_CONFIGS } from '@/constants/searchModules';
import { COLORS, SPACING, RADIUS } from '@/constants/config';

export default function ManaDiscoverScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const {
    query,
    setQuery,
    activeModules,
    toggleModule,
    clearAllModules,
    response,
    loading,
    error,
    loadMore,
    hasMore,
    recentSearches,
    clearRecents,
  } = useSearch();

  const handleResultPress = (result: SearchResultDto) => {
    const routes: Partial<Record<string, string>> = {
      EVENT:               `/events/${result.deepLinkId}`,
      FOOD_RESTAURANT:     `/food/restaurants/${result.deepLinkId}`,
      MARKETPLACE_LISTING: `/marketplace/${result.deepLinkId}`,
      HEALTH_DOCTOR:       `/health/doctors/${result.deepLinkId}`,
      TRIP:                `/trips/${result.deepLinkId}`,
      SPORTS_EVENT:        `/sports/${result.deepLinkId}`,
      JOB:                 `/jobs/${result.deepLinkId}`,
      HOME_SERVICE:        `/home-services/${result.deepLinkId}`,
      VENDOR:              `/vendor/${result.deepLinkId}`,
      COURSE:              `/academy/${result.deepLinkId}`,
    };
    const route = routes[result.deepLinkType];
    if (route) router.push(route as any);
  };

  const showResults = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.root}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search everything in your community..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        {query.length > 0 && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setQuery('')}>
            <Text style={styles.cancelText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ModuleFilterChips
        activeModules={activeModules}
        onToggle={(m) => toggleModule(m as SearchModule)}
        onClearAll={clearAllModules}
        facets={response?.facets}
      />

      {showResults ? (
        /* ── Search results ── */
        <FlatList
          data={response?.results ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SearchResultCard result={item} onPress={handleResultPress} />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            response != null ? (
              <View style={styles.resultsMeta}>
                <Text style={styles.resultsMetaText}>
                  {response.total} result{response.total !== 1 ? 's' : ''} for "{query}"
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" style={{ marginTop: 48 }} color="#7C3AED" />
            ) : error ? (
              <Text style={styles.emptyText}>{error}</Text>
            ) : response != null ? (
              <Text style={styles.emptyText}>No results for "{query}"</Text>
            ) : null
          }
          ListFooterComponent={
            hasMore ? <ActivityIndicator style={{ padding: 16 }} color="#7C3AED" /> : null
          }
        />
      ) : (
        /* ── Empty state: recents + category grid ── */
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.emptyState}>
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecents}>
                  <Text style={styles.clearBtn}>Clear all</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setQuery(s)}
                  style={styles.recentRow}
                >
                  <Text style={styles.recentIcon}>🕐</Text>
                  <Text style={styles.recentText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <View style={styles.categoryGrid}>
              {MODULE_CONFIGS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => {
                    toggleModule(m.value as SearchModule);
                    inputRef.current?.focus();
                  }}
                  style={[
                    styles.categoryCard,
                    activeModules.includes(m.value) && styles.categoryCardActive,
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{m.icon}</Text>
                  <Text style={styles.categoryLabel}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  cancelBtn: {
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '600',
  },
  resultsMeta: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  resultsMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 15,
    color: '#94A3B8',
  },
  emptyState: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: SPACING.md,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  clearBtn: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '600',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recentIcon: {
    fontSize: 16,
    color: '#94A3B8',
  },
  recentText: {
    fontSize: 14,
    color: COLORS.text,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  categoryCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
  },
  categoryCardActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
  },
  categoryEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
});
