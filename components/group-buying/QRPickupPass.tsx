import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { GroupOrderDto } from '@/types/groupBuying';

export default function QRPickupPass({ order }: { order: GroupOrderDto }) {
  const token = order.qrCode;
  // QR visual represented as block pattern (real implementation would use react-native-qrcode-svg)
  return (
    <View style={s.pass}>
      <View style={s.header}>
        <Ionicons name="qr-code" size={20} color={COLORS.primary} />
        <Text style={s.headerText}>Pickup Pass</Text>
        <View style={[s.statusBadge, order.status === 'PICKED_UP' && s.statusDone]}>
          <Text style={[s.statusText, order.status === 'PICKED_UP' && s.statusDoneText]}>
            {order.status === 'PICKED_UP' ? 'COLLECTED ✓' : 'READY FOR PICKUP'}
          </Text>
        </View>
      </View>
      {/* QR Block */}
      <View style={s.qrBox}>
        <View style={s.qrInner}>
          <Ionicons name="qr-code-outline" size={100} color={COLORS.text} />
        </View>
        <Text style={s.tokenText}>{token.slice(0, 22)}…</Text>
      </View>
      {/* Order details */}
      <View style={s.details}>
        <Row label="Order ID" value={order.id} />
        <Row label="Product" value={order.title} />
        <Row label="Quantity" value={`${order.qty} unit${order.qty > 1 ? 's' : ''}`} />
        <Row label="Total" value={`₹${order.total.toLocaleString()}`} bold />
        {order.pickupPoint && <Row label="Pickup At" value={order.pickupPoint} />}
        {order.pickupDate && <Row label="Pickup Date" value={order.pickupDate} />}
        {order.pickupSlot && <Row label="Time Slot" value={order.pickupSlot} />}
      </View>
      <Text style={s.notice}>Show this pass at the pickup desk. Staff will scan and verify.</Text>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, bold && s.rowValueBold]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pass: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 18, gap: 14, ...SHADOWS.lg, borderWidth: 1, borderColor: COLORS.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  statusBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusDone: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  statusDoneText: { color: '#065F46' },
  qrBox: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  qrInner: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  tokenText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' },
  details: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13, color: COLORS.textMuted },
  rowValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  rowValueBold: { fontWeight: '800', color: COLORS.primary, fontSize: 15 },
  notice: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic' },
});
