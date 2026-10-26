import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { paymentService, type CashfreeOrderResponse } from '@/services/paymentService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  PAID:           { label: 'Paid',           bg: '#ECFDF5', color: '#059669', icon: 'checkmark-circle' },
  CREATED:        { label: 'Pending',        bg: '#EEF2FF', color: '#4F46E5', icon: 'time-outline' },
  FAILED:         { label: 'Failed',         bg: '#FEF2F2', color: '#DC2626', icon: 'close-circle' },
  EXPIRED:        { label: 'Expired',        bg: '#F1F5F9', color: '#64748B', icon: 'alert-circle-outline' },
  REFUNDED:       { label: 'Refunded',       bg: '#FFF7ED', color: '#EA580C', icon: 'return-down-back-outline' },
  REFUND_PENDING: { label: 'Refund Pending', bg: '#FFF7ED', color: '#EA580C', icon: 'hourglass-outline' },
  PENDING:        { label: 'Pending',        bg: '#EEF2FF', color: '#4F46E5', icon: 'time-outline' },
};

export default function PaymentReceiptScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  // Look up the order from the already-fetched history list (avoids an extra API call).
  // Falls back to a fresh fetch if the history cache is not available.
  const { data: historyData } = useQuery({
    queryKey: ['payments', 'my'],
    queryFn: () => paymentService.getMyOrders(0, 50),
    staleTime: 30_000,
  });
  const cachedOrder = historyData?.content?.find((o) => o.manaOrderId === orderId);

  const { data: fetchedOrder, isLoading, isError } = useQuery<CashfreeOrderResponse>({
    queryKey: ['payments', 'my-order', orderId],
    queryFn: async () => {
      const page = await paymentService.getMyOrders(0, 200);
      const found = page.content.find((o) => o.manaOrderId === orderId);
      if (!found) throw new Error('Order not found');
      return found;
    },
    enabled: !!orderId && !cachedOrder,
    staleTime: 30_000,
  });

  const order = cachedOrder ?? fetchedOrder;

  const handleShare = async () => {
    if (!order) return;
    try {
      await Share.share({
        message: [
          `Mana Community Payment Receipt`,
          `Order ID: ${order.manaOrderId}`,
          `Amount: ₹${Number(order.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          `Status: ${STATUS_CONFIG[order.status]?.label ?? order.status}`,
          order.description ? `Description: ${order.description}` : '',
          order.paidAt ? `Paid on: ${format(new Date(order.paidAt), 'dd MMM yyyy, h:mm a')}` : '',
        ].filter(Boolean).join('\n'),
      });
    } catch { /* user cancelled */ }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Payment Receipt</Text>
        <TouchableOpacity onPress={handleShare} hitSlop={8} style={s.shareBtn} disabled={!order}>
          <Ionicons name="share-outline" size={20} color={order ? COLORS.primary : COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : isError || !order ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyText}>Receipt not found</Text>
          <Text style={s.emptySub}>This order could not be loaded.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Status Hero */}
          <StatusHero order={order} />

          {/* Amount Card */}
          <View style={s.amountCard}>
            <Text style={s.amountLabel}>Total Amount</Text>
            <Text style={s.amountValue}>
              ₹{Number(order.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            {order.currency && order.currency !== 'INR' && (
              <Text style={s.currency}>{order.currency}</Text>
            )}
          </View>

          {/* Details Table */}
          <View style={s.table}>
            <Row label="Order ID" value={order.manaOrderId} mono />
            {order.cfOrderId && <Row label="Gateway Order" value={order.cfOrderId} mono />}
            <Row label="Status" value={STATUS_CONFIG[order.status]?.label ?? order.status} highlight={order.status === 'PAID' ? '#059669' : undefined} />
            {order.referenceType && (
              <Row label="Purpose" value={order.referenceType.replace(/_/g, ' ')} />
            )}
            {order.description && <Row label="Description" value={order.description} />}
            {order.paymentMethod && <Row label="Payment Method" value={order.paymentMethod} />}
            {order.paidAt && (
              <Row label="Paid On" value={format(new Date(order.paidAt), 'dd MMM yyyy, h:mm a')} />
            )}
            <Row label="Created On" value={format(new Date(order.createdAt), 'dd MMM yyyy, h:mm a')} />
            {order.failureReason && (
              <Row label="Failure Reason" value={order.failureReason} valueColor="#DC2626" />
            )}
          </View>

          <Text style={s.footerNote}>
            Powered by Cashfree Payments. Transaction records are maintained for your security.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatusHero({ order }: { order: CashfreeOrderResponse }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
  return (
    <View style={[s.statusHero, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={44} color={cfg.color} />
      <Text style={[s.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
  valueColor,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: string;
  valueColor?: string;
}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text
        style={[
          s.rowValue,
          mono && s.rowValueMono,
          highlight ? { color: highlight, fontFamily: FONTS.bold } : undefined,
          valueColor ? { color: valueColor } : undefined,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  statusHero: {
    borderRadius: RADIUS.xl ?? 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  amountLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  currency: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: FONTS.medium,
    flex: 1.5,
    textAlign: 'right',
  },
  rowValueMono: {
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  footerNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
    paddingHorizontal: 8,
  },
});
