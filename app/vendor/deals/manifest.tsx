import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { vendorService } from '@/services/vendorService';

export default function VendorManifestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: manifest, isLoading, refetch } = useQuery({
    queryKey: ['vendor-manifest', id],
    queryFn: () => vendorService.getFulfillmentManifest(id ?? 'd1'),
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Fulfillment Manifest', headerBackTitle: 'Back' }} />
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {isLoading || !manifest ? (
          <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : (
          <>
            <View style={s.summaryCard}>
              <Text style={s.dealTitle}>{manifest.dealTitle}</Text>
              <Text style={s.locText}>📍 {manifest.pickupLocation} · Delivery: {manifest.deliveryDate}</Text>
              <View style={s.statRow}>
                <View style={s.statBox}><Text style={s.statNum}>{manifest.totalQty}</Text><Text style={s.statLabel}>Total Units</Text></View>
                <View style={s.statDiv} />
                <View style={s.statBox}><Text style={s.statNum}>₹{manifest.totalRevenue.toLocaleString()}</Text><Text style={s.statLabel}>Revenue</Text></View>
                <View style={s.statDiv} />
                <View style={s.statBox}><Text style={s.statNum}>{manifest.orders.length}</Text><Text style={s.statLabel}>Flats</Text></View>
              </View>
            </View>

            <View style={s.scannerBtnWrap}>
              <TouchableOpacity style={s.scanBtn} onPress={() => router.push('/group-buying/pickup/scan' as any)} activeOpacity={0.85}>
                <Ionicons name="scan-outline" size={18} color="#fff" />
                <Text style={s.scanBtnText}>Open QR Handover Scanner</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionTitle}>Resident Order Breakdown ({manifest.orders.length} Flats)</Text>
            {manifest.orders.map(order => (
              <View key={order.id} style={s.orderRow}>
                <View style={s.flatBadge}>
                  <Text style={s.flatText}>{order.flat}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.resName}>{order.residentName}</Text>
                  <Text style={s.orderRef}>{order.orderId}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.qtyText}>{order.qty} bags</Text>
                  <Text style={s.totalText}>₹{order.total}</Text>
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  center: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  summaryCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 18, gap: 8, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  dealTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  locText: { fontSize: 13, color: COLORS.textMuted },
  statRow: { flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: 12, marginTop: 6 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  statDiv: { width: 1, height: 28, backgroundColor: COLORS.border },
  scannerBtnWrap: { marginVertical: 4 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12 },
  scanBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  flatBadge: { width: 54, height: 38, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  flatText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  resName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  orderRef: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  qtyText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  totalText: { fontSize: 12, color: '#059669', fontWeight: '700' },
});
