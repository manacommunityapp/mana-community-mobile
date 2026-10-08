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
          <Text style={s.heroTitle}>10-State Transactional Inventory</Text>
          <Text style={s.heroSub}>Pessimistic locking reserves stock at checkout before group order finalization.</Text>
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

        <Text style={s.sectionTitle}>Variant Stock Breakdown (10 Lifecycle States)</Text>

        {products.map(p => (
          <View key={p.id} style={s.card}>
            <Text style={s.prodName}>{p.name}</Text>
            {p.variants.map(v => {
              const b = v.inventoryBreakdown || {
                available: v.availableQty,
                reserved: v.reservedQty,
                committed: v.committedQty,
                allocated: 0,
                ready: 0,
                dispatched: 0,
                delivered: 0,
                damaged: 0,
                expired: 0,
                cancelled: 0,
              };
              return (
                <View key={v.id} style={s.variantContainer}>
                  <View style={s.variantHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.vTitle}>{v.variantName} ({v.packSize})</Text>
                      <Text style={s.sku}>SKU: {v.sku}</Text>
                    </View>
                    <Text style={s.availText}>{v.availableQty} Avail</Text>
                  </View>

                  {/* 10-State Pills Matrix */}
                  <View style={s.statesMatrix}>
                    <View style={[s.stateChip, { backgroundColor: '#ECFDF5' }]}><Text style={[s.stateNum, { color: '#059669' }]}>{b.available}</Text><Text style={s.stateLbl}>AVAILABLE</Text></View>
                    <View style={[s.stateChip, { backgroundColor: '#FEF3C7' }]}><Text style={[s.stateNum, { color: '#D97706' }]}>{b.reserved}</Text><Text style={s.stateLbl}>RESERVED</Text></View>
                    <View style={[s.stateChip, { backgroundColor: '#EEF2FF' }]}><Text style={[s.stateNum, { color: '#4F46E5' }]}>{b.committed}</Text><Text style={s.stateLbl}>COMMITTED</Text></View>
                    <View style={[s.stateChip, { backgroundColor: '#F0FDF4' }]}><Text style={[s.stateNum, { color: '#16A34A' }]}>{b.allocated}</Text><Text style={s.stateLbl}>ALLOCATED</Text></View>
                    <View style={[s.stateChip, { backgroundColor: '#E0F2FE' }]}><Text style={[s.stateNum, { color: '#0284C7' }]}>{b.ready}</Text><Text style={s.stateLbl}>READY</Text></View>
                    <View style={[s.stateChip, { backgroundColor: '#F3E8FF' }]}><Text style={[s.stateNum, { color: '#7C3AED' }]}>{b.dispatched}</Text><Text style={s.stateLbl}>DISPATCHED</Text></View>
                    <View style={[s.stateChip, { backgroundColor: '#DCFCE7' }]}><Text style={[s.stateNum, { color: '#15803D' }]}>{b.delivered}</Text><Text style={s.stateLbl}>DELIVERED</Text></View>
                    <View style={[s.stateChip, { backgroundColor: '#FEE2E2' }]}><Text style={[s.stateNum, { color: '#DC2626' }]}>{b.damaged}</Text><Text style={s.stateLbl}>DAMAGED</Text></View>
                  </View>
                </View>
              );
            })}
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
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  prodName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  variantContainer: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: 12, gap: 10 },
  variantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sku: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  availText: { fontSize: 14, fontWeight: '800', color: '#059669' },
  statesMatrix: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stateChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: 'center', minWidth: 68 },
  stateNum: { fontSize: 12, fontWeight: '800' },
  stateLbl: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, marginTop: 1 },
});