import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { vendorCommerceService } from '@/services/vendorCommerceService';
import type { VendorProductDto } from '@/types/vendorCommerce';

export default function VendorProductsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['vendor-products'],
    queryFn: vendorCommerceService.getProducts,
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['vendor-commerce-stats'],
    queryFn: vendorCommerceService.getStats,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProducts(), refetchStats()]);
    setRefreshing(false);
  }, [refetchProducts, refetchStats]);

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())));

  return (
    <>
      <Stack.Screen options={{ title: 'My Product Catalog', headerBackTitle: 'Back' }} />
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {/* ── Stats Row ── */}
        {stats && (
          <View style={s.statsCard}>
            <View style={s.statBox}><Text style={s.statNum}>{stats.totalProducts}</Text><Text style={s.statLabel}>Products</Text></View>
            <View style={s.statDiv} />
            <View style={s.statBox}><Text style={[s.statNum, { color: '#059669' }]}>{stats.activeProducts}</Text><Text style={s.statLabel}>Active</Text></View>
            <View style={s.statDiv} />
            <View style={s.statBox}><Text style={[s.statNum, { color: '#DC2626' }]}>{stats.outOfStockProducts}</Text><Text style={s.statLabel}>Out of Stock</Text></View>
            <View style={s.statDiv} />
            <View style={s.statBox}><Text style={[s.statNum, { color: '#D97706' }]}>{stats.draftProducts}</Text><Text style={s.statLabel}>Drafts</Text></View>
          </View>
        )}

        {/* ── Action Row ── */}
        <View style={s.actionRow}>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
            <TextInput style={s.searchInput} placeholder="Search catalog..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/vendor/products/create' as any)} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addBtnText}>Add Product</Text>
          </TouchableOpacity>
        </View>

        {/* ── Catalog List ── */}
        {loadingProducts ? (
          <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : (
          filtered.map(product => (
            <View key={product.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  {product.brand ? <Text style={s.brand}>{product.brand}</Text> : null}
                  <Text style={s.name}>{product.name}</Text>
                  <Text style={s.category}>{product.category} · {product.subCategory ?? ''}</Text>
                </View>
                <View style={s.stockBadge}>
                  <Text style={s.stockNum}>{product.totalStock}</Text>
                  <Text style={s.stockLabel}>in stock</Text>
                </View>
              </View>

              <Text style={s.variantTitle}>Variants ({product.variants.length})</Text>
              <View style={s.variantList}>
                {product.variants.map(v => (
                  <View key={v.id} style={s.variantRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.vName}>{v.variantName} <Text style={s.vSku}>({v.sku})</Text></Text>
                      <Text style={s.vPricing}>MRP ₹{v.mrp} · Cost ₹{v.vendorCost} · Community <Text style={{ color: COLORS.primary, fontWeight: '800' }}>₹{v.defaultCommunityPrice}</Text></Text>
                    </View>
                    <View style={s.vStockCol}>
                      <Text style={s.vStock}>{v.availableQty} avail</Text>
                      {v.committedQty > 0 ? <Text style={s.vComm}>{v.committedQty} committed</Text> : null}
                    </View>
                  </View>
                ))}
              </View>

              <View style={s.cardActions}>
                <TouchableOpacity
                  style={s.createDealBtn}
                  onPress={() => router.push('/vendor/deals/create' as any)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="flame-outline" size={15} color="#fff" />
                  <Text style={s.createDealText}>Create Group Deal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.inventoryBtn}
                  onPress={() => router.push('/vendor/inventory' as any)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="layers-outline" size={15} color={COLORS.primary} />
                  <Text style={s.inventoryBtnText}>Inventory</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  statsCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statDiv: { width: 1, height: 28, backgroundColor: COLORS.border },
  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 11 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', marginBottom: 2 },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  category: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  stockBadge: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  stockNum: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  stockLabel: { fontSize: 10, color: COLORS.textSecondary },
  variantTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginTop: 4 },
  variantList: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: 10, gap: 8 },
  variantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6 },
  vName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  vSku: { fontSize: 11, color: COLORS.textMuted, fontWeight: '400' },
  vPricing: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  vStockCol: { alignItems: 'flex-end' },
  vStock: { fontSize: 12, fontWeight: '700', color: '#059669' },
  vComm: { fontSize: 11, color: '#D97706', fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  createDealBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 10 },
  createDealText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  inventoryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10 },
  inventoryBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});
