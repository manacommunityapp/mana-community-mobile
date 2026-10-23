import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { SupplierProfile, ProcurementCategory, SupplierProduct } from '@/types/procurement';

const CATEGORIES: { value: ProcurementCategory | 'ALL'; label: string; emoji: string }[] = [
  { value: 'ALL',               label: 'All',          emoji: '🔍' },
  { value: 'CLEANING_SUPPLIES', label: 'Cleaning',     emoji: '🧹' },
  { value: 'ELECTRICAL',        label: 'Electrical',   emoji: '⚡' },
  { value: 'PLUMBING',          label: 'Plumbing',     emoji: '🔧' },
  { value: 'OFFICE_SUPPLIES',   label: 'Office',       emoji: '📎' },
  { value: 'GARDENING',         label: 'Gardening',    emoji: '🌿' },
  { value: 'SECURITY_EQUIPMENT',label: 'Security',     emoji: '🔒' },
  { value: 'FURNITURE',         label: 'Furniture',    emoji: '🪑' },
  { value: 'IT_EQUIPMENT',      label: 'IT',           emoji: '💻' },
  { value: 'MAINTENANCE',       label: 'Maintenance',  emoji: '🔨' },
  { value: 'OTHER',             label: 'Other',        emoji: '📦' },
];

type Tab = 'SUPPLIERS' | 'PRODUCTS';

export default function SupplierMarketplace() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: ProcurementCategory }>();
  const [tab, setTab] = useState<Tab>('SUPPLIERS');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<ProcurementCategory | 'ALL'>(params.category || 'ALL');
  const [refreshing, setRefreshing] = useState(false);

  const catParam = selectedCat === 'ALL' ? undefined : selectedCat;

  const { data: suppliers = [], isLoading: loadingSuppliers, refetch: refetchSuppliers } = useQuery({
    queryKey: ['suppliers', catParam],
    queryFn: () => procurementHubService.getSuppliers({ category: catParam }),
    enabled: tab === 'SUPPLIERS',
  });

  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['products', catParam],
    queryFn: () => procurementHubService.getAllProducts({ category: catParam }),
    enabled: tab === 'PRODUCTS',
  });

  const filteredSuppliers = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(s =>
      s.businessName.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.categories.some(c => c.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q)
    );
  }, [products, search]);

  async function onRefresh() {
    setRefreshing(true);
    await (tab === 'SUPPLIERS' ? refetchSuppliers() : refetchProducts());
    setRefreshing(false);
  }

  const isLoading = tab === 'SUPPLIERS' ? loadingSuppliers : loadingProducts;

  return (
    <View style={s.root}>
      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder={tab === 'SUPPLIERS' ? 'Search suppliers, city…' : 'Search products…'}
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['SUPPLIERS', 'PRODUCTS'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'SUPPLIERS' ? '🏭 Suppliers' : '📦 Products'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categoryChips}
        style={s.categoryRow}
      >
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.value}
            style={[s.chip, selectedCat === c.value && s.chipActive]}
            onPress={() => setSelectedCat(c.value)}
          >
            <Text style={s.chipEmoji}>{c.emoji}</Text>
            <Text style={[s.chipText, selectedCat === c.value && s.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} tintColor="#2563EB" />}
      >
        {isLoading && <ActivityIndicator color="#2563EB" style={{ marginTop: 32 }} />}

        {!isLoading && tab === 'SUPPLIERS' && filteredSuppliers.map(sup => (
          <SupplierCard key={sup.id} supplier={sup} onPress={() => router.push((`/procurement/supplier-marketplace`) as any)} />
        ))}

        {!isLoading && tab === 'PRODUCTS' && filteredProducts.map(p => (
          <ProductCard key={p.id} product={p} onAddToRFQ={() => router.push('/procurement/rfq/new' as any)} />
        ))}

        {!isLoading && tab === 'SUPPLIERS' && filteredSuppliers.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="business-outline" size={36} color="#93C5FD" />
            <Text style={s.emptyTitle}>No suppliers found</Text>
            <Text style={s.emptySub}>Try a different category or search term</Text>
          </View>
        )}

        {!isLoading && tab === 'PRODUCTS' && filteredProducts.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={36} color="#93C5FD" />
            <Text style={s.emptyTitle}>No products found</Text>
            <Text style={s.emptySub}>Try a different category or search term</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function SupplierCard({ supplier: s, onPress }: { supplier: SupplierProfile; onPress: () => void }) {
  const verified = s.verificationStatus === 'VERIFIED';
  return (
    <TouchableOpacity style={sc.card} onPress={onPress} activeOpacity={0.85}>
      <View style={sc.top}>
        <View style={sc.avatar}>
          <Text style={sc.avatarText}>{s.businessName.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={sc.name} numberOfLines={1}>{s.businessName}</Text>
            {verified && <Ionicons name="checkmark-circle" size={14} color="#059669" />}
          </View>
          <Text style={sc.city}>{s.city} · {s.serviceArea.slice(0, 2).join(', ')}</Text>
        </View>
        <View style={sc.ratingBadge}>
          <Ionicons name="star" size={11} color="#F59E0B" />
          <Text style={sc.rating}>{s.rating.toFixed(1)}</Text>
        </View>
      </View>
      <View style={sc.cats}>
        {s.categories.slice(0, 3).map(c => (
          <View key={c} style={sc.catPill}>
            <Text style={sc.catPillText}>{c.replace(/_/g, ' ')}</Text>
          </View>
        ))}
      </View>
      <View style={sc.metrics}>
        <View style={sc.metric}>
          <Text style={sc.metricVal}>{s.totalOrders}</Text>
          <Text style={sc.metricLabel}>Orders</Text>
        </View>
        <View style={sc.metric}>
          <Text style={sc.metricVal}>{s.fulfillmentRate}%</Text>
          <Text style={sc.metricLabel}>Fulfillment</Text>
        </View>
        <View style={sc.metric}>
          <Text style={sc.metricVal}>{s.onTimeRate}%</Text>
          <Text style={sc.metricLabel}>On Time</Text>
        </View>
        <View style={sc.metric}>
          <Text style={sc.metricVal}>{s.reviewCount}</Text>
          <Text style={sc.metricLabel}>Reviews</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ProductCard({ product: p, onAddToRFQ }: { product: SupplierProduct; onAddToRFQ: () => void }) {
  return (
    <View style={pc.card}>
      <View style={pc.top}>
        <View style={{ flex: 1 }}>
          <Text style={pc.name} numberOfLines={2}>{p.name}</Text>
          <Text style={pc.supplier}>{p.supplierName}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={pc.price}>₹{p.wholesalePrice}/{p.unit}</Text>
          {p.retailPrice && (
            <Text style={pc.mrp}>MRP ₹{p.retailPrice}</Text>
          )}
        </View>
      </View>
      <View style={pc.meta}>
        <Text style={pc.metaItem}>MOQ: {p.moq} {p.unit}</Text>
        <Text style={pc.metaItem}>Lead: {p.leadTimeDays}d</Text>
        <Text style={pc.metaItem}>GST: {p.gstPercent}%</Text>
        <View style={[pc.stockBadge, { backgroundColor: p.inStock ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: p.inStock ? '#166534' : '#991B1B' }}>
            {p.inStock ? 'In Stock' : 'Out of Stock'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={pc.addBtn} onPress={onAddToRFQ}>
        <Ionicons name="add-circle-outline" size={15} color="#2563EB" />
        <Text style={pc.addBtnText}>Add to RFQ</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  searchWrap: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, backgroundColor: '#fff' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text, paddingVertical: 0 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: RADIUS.md,
    alignItems: 'center', backgroundColor: '#F1F5F9',
  },
  tabActive: { backgroundColor: '#EFF6FF' },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#2563EB', fontWeight: '700' },
  categoryRow: { backgroundColor: '#fff', maxHeight: 48 },
  categoryChips: { paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  chipTextActive: { color: '#2563EB' },
  list: { padding: 12, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  emptySub: { fontSize: 12, color: COLORS.textMuted },
});

const sc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#1D4ED8' },
  name: { fontSize: 14, fontWeight: '800', color: '#1E293B', flex: 1 },
  city: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
  },
  rating: { fontSize: 12, fontWeight: '800', color: '#D97706' },
  cats: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  catPill: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catPillText: { fontSize: 10, fontWeight: '600', color: '#2563EB' },
  metrics: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 10 },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricVal: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  metricLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
});

const pc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  supplier: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  price: { fontSize: 16, fontWeight: '900', color: '#2563EB' },
  mrp: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaItem: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  stockBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
});
