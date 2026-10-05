import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Share, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import QRPickupPass from '@/components/group-buying/QRPickupPass';
import type { GroupOrderDto } from '@/types/groupBuying';

import { useRouter } from 'expo-router';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED:       { label: 'Confirmed', color: '#2563EB', bg: '#DBEAFE' },
  PAYMENT_PENDING: { label: 'Payment Pending', color: '#D97706', bg: '#FEF3C7' },
  PICKED_UP:       { label: 'Collected ✓', color: '#059669', bg: '#DCFCE7' },
  CANCELLED:       { label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2' },
  REFUNDED:        { label: 'Refunded', color: '#6B7280', bg: '#F1F5F9' },
};

export default function MyGroupOrders() {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<GroupOrderDto | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['my-orders'],
    queryFn: groupBuyingService.getMyOrders,
  });

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const active = orders.filter(o => !['PICKED_UP','CANCELLED','REFUNDED'].includes(o.status));
  const past = orders.filter(o => ['PICKED_UP','CANCELLED','REFUNDED'].includes(o.status));

  const handleShare = async (order: GroupOrderDto) => {
    await Share.share({ message: 'Mana Group Buy Pass\n' + order.title + '\nOrder: ' + order.id + '\nQty: ' + order.qty + '\nTotal: ₹' + order.total + '\nPickup: ' + (order.pickupPoint ?? '') });
  };

  function OrderCard({ order }: { order: GroupOrderDto }) {
    const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.CONFIRMED;
    const isCollected = order.status === 'PICKED_UP';

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.orderId}>{order.id}</Text>
            <Text style={s.orderTitle}>{order.title}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detail}>Qty: <Text style={s.detailBold}>{order.qty}</Text></Text>
          <Text style={s.detail}>Total: <Text style={s.detailBold}>₹{(order.total ?? order.totalPrice ?? 0).toLocaleString()}</Text></Text>
          {order.savings ? <Text style={s.savings}>Saved ₹{order.savings}</Text> : null}
        </View>
        {order.pickupPoint ? (
          <View style={s.pickupRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={s.pickupText}>{order.pickupPoint}{order.pickupDate ? ' · ' + order.pickupDate : ''}{order.pickupSlot ? ' · ' + order.pickupSlot : ''}</Text>
          </View>
        ) : null}
        <View style={s.actions}>
          {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
            <TouchableOpacity style={s.qrBtn} onPress={() => router.push(`/group-buying/pickup/${order.id}`)}>
              <Ionicons name="qr-code-outline" size={15} color={COLORS.primary} />
              <Text style={s.qrBtnText}>Pickup Pass</Text>
            </TouchableOpacity>
          )}

          {isCollected && (
            <TouchableOpacity
              style={s.reviewBtn}
              onPress={() => router.push(`/group-buying/orders/${order.id}/review`)}
            >
              <Ionicons name="star-outline" size={14} color="#D97706" />
              <Text style={s.reviewBtnText}>Rate</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={s.disputeBtn}
            onPress={() => router.push(`/group-buying/orders/${order.id}/dispute`)}
          >
            <Ionicons name="shield-outline" size={14} color={COLORS.textSecondary} />
            <Text style={s.disputeBtnText}>Report Issue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.shareBtn} onPress={() => handleShare(order)}>
            <Ionicons name="share-social-outline" size={15} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : orders.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>No Orders Yet</Text>
          <Text style={s.emptySub}>Join a group deal to see your orders here.</Text>
        </View>
      ) : (
        <>
          {active.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Active Orders ({active.length})</Text>
              {active.map(o => <OrderCard key={o.id} order={o} />)}
            </View>
          )}
          {past.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Past Orders ({past.length})</Text>
              {past.map(o => <OrderCard key={o.id} order={o} />)}
            </View>
          )}
        </>
      )}
      <View style={{ height: 32 }} />

      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Pickup Pass</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {selectedOrder && <QRPickupPass order={selectedOrder} />}
            {selectedOrder && (
              <TouchableOpacity style={s.shareFullBtn} onPress={() => handleShare(selectedOrder)}>
                <Ionicons name="share-social-outline" size={16} color={COLORS.primary} />
                <Text style={s.shareFullBtnText}>Share Pass</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 32 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  section: { marginBottom: SPACING.lg, gap: SPACING.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  orderId: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' },
  orderTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  detailRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  detail: { fontSize: 13, color: COLORS.textSecondary },
  detailBold: { fontWeight: '800', color: COLORS.text },
  savings: { fontSize: 12, fontWeight: '700', color: '#059669' },
  pickupRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pickupText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  qrBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 9 },
  qrBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 9, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#FDE68A' },
  reviewBtnText: { fontSize: 12, fontWeight: '800', color: '#B45309' },
  disputeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 10, paddingVertical: 9, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  disputeBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  shareBtn: { padding: 9, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.md, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  shareFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12 },
  shareFullBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});