import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, BackHandler, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { sellerService, SellerProfile, SellerType } from '@/services/sellerService';

type FilterKey = 'ALL' | SellerType;

const FILTERS: { key: FilterKey; label: string; emoji: string }[] = [
  { key: 'ALL',       label: 'All',       emoji: '🏘️' },
  { key: 'HOME_CHEF', label: 'Home Chef', emoji: '🍳' },
  { key: 'TUTOR',     label: 'Tutor',     emoji: '📚' },
  { key: 'TAILOR',    label: 'Tailor',    emoji: '🪡' },
  { key: 'BEAUTY',    label: 'Beauty',    emoji: '💅' },
  { key: 'PET_CARE',  label: 'Pets',      emoji: '🐾' },
  { key: 'OTHER',     label: 'Other',     emoji: '🔧' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Ionicons name="star" size={12} color="#F59E0B" />
      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.text }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function SellerCard({ seller, onPress }: { seller: SellerProfile; onPress: () => void }) {
  const initials = seller.businessName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const typeLabel = FILTERS.find(f => f.key === seller.sellerType)?.label ?? seller.sellerType;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName} numberOfLines={1}>{seller.businessName}</Text>
          {seller.isVerified && (
            <Ionicons name="checkmark-circle" size={15} color="#2563EB" />
          )}
        </View>
        <Text style={styles.cardType}>{typeLabel}</Text>
        <View style={styles.cardFooter}>
          <StarRating rating={seller.avgRating} />
          <Text style={styles.reviewCount}>({seller.totalReviews})</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

export default function SellerDiscoveryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const communityId: number = (user as any)?.communityId ?? 0;

  const [filter, setFilter] = useState<FilterKey>('ALL');

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (router.canGoBack()) { router.back(); return true; }
        return false;
      });
      return () => sub.remove();
    }, [router])
  );

  const { data: sellers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['community-sellers', communityId, filter],
    queryFn: () => sellerService.getCommunityListings(
      communityId,
      filter === 'ALL' ? undefined : filter as SellerType,
    ),
    staleTime: 2 * 60 * 1000,
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Community Sellers</Text>
          <Text style={styles.headerSub}>Home chefs, tutors & local services</Text>
        </View>
      </View>

      {/* Filter chips */}
      <FlatList
        data={FILTERS}
        keyExtractor={f => f.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={styles.filterEmoji}>{f.emoji}</Text>
            <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Sellers list */}
      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={sellers}
          keyExtractor={s => String(s.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No sellers found in this category.</Text>
              <Text style={styles.emptySubText}>Be the first to register!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <SellerCard
              seller={item}
              onPress={() => router.push(`/marketplace/sellers/${item.id}`)}
            />
          )}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.becomeSellerBanner}
              onPress={() => Linking.openURL('https://mana.community/become-seller')}
            >
              <Ionicons name="storefront-outline" size={20} color="#7C3AED" />
              <View style={{ flex: 1 }}>
                <Text style={styles.becomeTitle}>Become a Seller</Text>
                <Text style={styles.becomeSubtitle}>Offer your skills or food to neighbours</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#7C3AED" />
            </TouchableOpacity>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border ?? '#E2E8F0',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  headerSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },

  filterRow: { paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border ?? '#E2E8F0',
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    backgroundColor: '#EDE9FE', borderColor: '#7C3AED',
  },
  filterEmoji: { fontSize: 14 },
  filterLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted },
  filterLabelActive: { color: '#7C3AED', fontWeight: '700' },

  list: { padding: SPACING.md, gap: 10, paddingBottom: 48 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: 14,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#7C3AED' },
  cardBody: { flex: 1, gap: 2 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardName: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  cardType: { fontSize: 12, color: COLORS.textMuted },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  reviewCount: { fontSize: 12, color: COLORS.textMuted },

  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
  emptySubText: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  becomeSellerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F3FF', borderRadius: RADIUS.md, padding: 14,
    borderWidth: 1, borderColor: '#DDD6FE',
    marginTop: 8,
  },
  becomeTitle:    { fontSize: 14, fontWeight: '700', color: '#7C3AED' },
  becomeSubtitle: { fontSize: 12, color: '#8B5CF6', marginTop: 1 },
});
