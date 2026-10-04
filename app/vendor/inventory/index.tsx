import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { vendorCommerceService } from '@/services/vendorCommerceService';

export default function VendorInventoryScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: products = [], refetch } = useQuery({
    queryKey: ['vendor-products'],
    queryFn: vendorCommerceService.getProducts,
  });

  const { data: stats } = useQuery({
    queryKey: ['vendor-commerce-stats'],
    queryFn: vendorCommerceService.getStats,
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Stock & Inventory Ledger', headerBackTitle: 'Back' }} />
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        <View style={s.heroCard}>
          <Text style={s.heroTitle}>Multi-State Inventory Ledger</Text>
          <Text style={s.heroSub}>Pessimistic locking prevents stock overselling during flash resident checkouts.</Text>
          {stats && (
            <View style={s.statsGrid}>
              <View style={s.statBox}><Text style={s.statNum}>{stats.totalInventoryUnits}</Text><Text style={s.statLabel}>Available</Text></View>
              <View style={s.statDiv} />
              <View style={s.statBox}><Text style={[s.statNum, { color: '#D97706' }]}>{stats.reservedUnits}</Text><Text style={s.statLabel}>Reserved</Text></View>
              <View style={s.statDiv} />
              <View style={s.statBox}><Text style={[s.statNum, { color: '#059669' }]}>{stats.committedUnits}</Text><Text style={s.statLabel}>Committed</Text></View>
            </View>
          )}
        </View>

        <Text style={s.sectionTitle}>Variant Stock Levels</Text>

        {products.map(p => (
          <View key={p.id} style={s.card}>
            <Text style={s.prodName}>{p.name}</Text>
            {p.variants.map(v => (
              <View key={v.id} style={s.variantRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.vTitle}>{v.variantName} ({v.packSize})</Text>
                  <Text style={s.sku}>SKU: {v.sku}</Text>
                </View>
                <View style={s.stateCol}>
                  <Text style={s.availText}>{v.availableQty} Avail</Text>
                  <Text style={s.resText}>{v.reservedQty} Rsvd · {v.committedQty} Cmt</Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  heroCard: { backgroundColor: '#EEF2FF', borderRadius: RADIUS.xl, padding: 18, gap: 8, borderWidth: 1, borderColor: COLORS.primaryLight },
  heroTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  heroSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  statsGrid: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12, marginTop: 4 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  statDiv: { width: 1, height: 28, backgroundColor: COLORS.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  prodName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  variantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 10 },
  vTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sku: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  stateCol: { alignItems: 'flex-end' },
  availText: { fontSize: 14, fontWeight: '800', color: '#059669' },
  resText: { fontSize: 11, color: '#D97706', marginTop: 2 },
});
