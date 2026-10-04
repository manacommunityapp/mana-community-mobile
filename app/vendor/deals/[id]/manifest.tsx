import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';
import { vendorService } from '@/services/vendorService';

export default function VendorFulfillmentManifestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [checkedOrders, setCheckedOrders] = useState<Record<string, boolean>>({});

  const { data: manifest, isLoading } = useQuery({
    queryKey: ['manifest', id],
    queryFn: () => vendorService.getFulfillmentManifest(id as string),
    enabled: !!id,
  });

  const toggleCheck = (orderId: string) => {
    setCheckedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleShareManifest = async () => {
    if (!manifest) return;
    const text = `Fulfillment Manifest: ${manifest.dealTitle}\nTotal Quantity: ${manifest.totalQty} units | Revenue: ?${manifest.totalRevenue}\nLocation: ${manifest.pickupLocation}\nDelivery Date: ${manifest.deliveryDate}\n\nOrders:\n` +
      manifest.orders.map(o => `- Flat ${o.flat}: ${o.qty} units (${o.residentName}) - ${o.orderId}`).join('\n');
    await Share.share({ message: text });
  };

  if (isLoading) {
    return (
      <View style={s.center}><ActivityIndicator size="large" color={VENDOR_COLORS.accent} /></View>
    );
  }

  if (!manifest) {
    return (
      <View style={s.center}>
        <Text style={s.errorTitle}>Manifest Not Found</Text>
      </View>
    );
  }

  const packedCount = Object.values(checkedOrders).filter(Boolean).length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Fulfillment Manifest</Text>
        <TouchableOpacity onPress={handleShareManifest} style={s.shareBtn}>
          <Ionicons name="share-social-outline" size={20} color={VENDOR_COLORS.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Overview Banner */}
        <View style={s.overviewCard}>
          <Text style={s.dealTitle}>{manifest.dealTitle}</Text>
          <View style={s.overviewGrid}>
            <View style={s.gridItem}>
              <Text style={s.gridNum}>{manifest.totalQty}</Text>
              <Text style={s.gridLabel}>Total Bags / Units</Text>
            </View>
            <View style={s.gridDivider} />
            <View style={s.gridItem}>
              <Text style={s.gridNum}>?{manifest.totalRevenue.toLocaleString()}</Text>
              <Text style={s.gridLabel}>Gross Revenue</Text>
            </View>
            <View style={s.gridDivider} />
            <View style={s.gridItem}>
              <Text style={s.gridNum}>{manifest.orders.length}</Text>
              <Text style={s.gridLabel}>Resident Orders</Text>
            </View>
          </View>

          <View style={s.locationInfo}>
            <Ionicons name="location-outline" size={16} color={COLORS.textMuted} />
            <Text style={s.locationText}>{manifest.pickupLocation} ? Dispatch: {manifest.deliveryDate}</Text>
          </View>
        </View>

        {/* Packing Checklist Progress */}
        <View style={s.checklistHeader}>
          <Text style={s.sectionHeading}>Flat-by-Flat Packaging Checklist</Text>
          <Text style={s.checkCount}>{packedCount} / {manifest.orders.length} Prepared</Text>
        </View>

        {/* Order Manifest List */}
        <View style={s.orderList}>
          {manifest.orders.map(order => {
            const isChecked = !!checkedOrders[order.id];
            return (
              <TouchableOpacity
                key={order.id}
                style={[s.orderRow, isChecked && s.orderRowChecked]}
                onPress={() => toggleCheck(order.id)}
                activeOpacity={0.8}
              >
                <View style={[s.checkbox, isChecked && s.checkboxChecked]}>
                  {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>

                <View style={s.flatBadge}>
                  <Text style={s.flatText}>{order.flat}</Text>
                </View>

                <View style={s.orderInfo}>
                  <Text style={s.residentName}>{order.residentName}</Text>
                  <Text style={s.orderMeta}>{order.orderId}</Text>
                </View>

                <View style={s.qtyBox}>
                  <Text style={s.qtyNum}>{order.qty} unit{order.qty > 1 ? 's' : ''}</Text>
                  <Text style={s.qtyTotal}>?{order.total}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Handover Action */}
        <TouchableOpacity
          style={s.handoverBtn}
          onPress={() => {
            Alert.alert(
              'Dispatch Confirmed',
              `All ${manifest.totalQty} units dispatched to ${manifest.pickupLocation}. Residents are notified that items are ready for pickup.`,
              [{ text: 'OK', onPress: () => router.back() }]
            );
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          <Text style={s.handoverBtnText}>Confirm Delivery to Clubhouse</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  shareBtn: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  overviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  dealTitle: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
  },
  gridItem: { alignItems: 'center', gap: 2 },
  gridNum: { fontSize: 18, fontWeight: '900', color: VENDOR_COLORS.accent },
  gridLabel: { fontSize: 11, color: COLORS.textMuted },
  gridDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeading: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase' },
  checkCount: { fontSize: 12, fontWeight: '700', color: VENDOR_COLORS.accent },
  orderList: { gap: 8 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  orderRowChecked: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#059669', borderColor: '#059669' },
  flatBadge: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 46,
    alignItems: 'center',
  },
  flatText: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  orderInfo: { flex: 1, gap: 2 },
  residentName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  orderMeta: { fontSize: 11, color: COLORS.textMuted },
  qtyBox: { alignItems: 'flex-end', gap: 2 },
  qtyNum: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  qtyTotal: { fontSize: 11, color: COLORS.textMuted },
  handoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    marginTop: 10,
  },
  handoverBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
