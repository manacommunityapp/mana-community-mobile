import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { paymentService, type CashfreeOrderResponse } from '@/services/paymentService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PAID:           { label: 'Paid',           bg: '#ECFDF5', color: '#059669' },
  CREATED:        { label: 'Pending',        bg: '#EEF2FF', color: '#4F46E5' },
  FAILED:         { label: 'Failed',         bg: '#FEF2F2', color: '#DC2626' },
  EXPIRED:        { label: 'Expired',        bg: '#F1F5F9', color: '#64748B' },
  REFUNDED:       { label: 'Refunded',       bg: '#FFF7ED', color: '#EA580C' },
  REFUND_PENDING: { label: 'Refund pending', bg: '#FFF7ED', color: '#EA580C' },
  PENDING:        { label: 'Pending',        bg: '#EEF2FF', color: '#4F46E5' },
};

export default function PaymentHistoryScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['payments', 'my'],
    queryFn: () => paymentService.getMyOrders(0, 50),
  });

  const orders: CashfreeOrderResponse[] = data?.content ?? [];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Payment History</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyText}>No payments yet</Text>
          <Text style={s.emptySub}>Your transaction history will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.manaOrderId}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => <PaymentCard order={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function PaymentCard({ order }: { order: CashfreeOrderResponse }) {
  const router = useRouter();
  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
  const date = order.paidAt ?? order.createdAt;

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/payments/receipt', params: { orderId: order.manaOrderId } })}
    >
      <View style={s.cardRow}>
        <View style={s.cardLeft}>
          <Text style={s.refType} numberOfLines={1}>
            {order.referenceType?.replace(/_/g, ' ')}
          </Text>
          <Text style={s.orderId} numberOfLines={1}>{order.manaOrderId}</Text>
          {order.description ? (
            <Text style={s.desc} numberOfLines={1}>{order.description}</Text>
          ) : null}
          <Text style={s.date}>
            {format(new Date(date), 'dd MMM yyyy, h:mm a')}
          </Text>
        </View>
        <View style={s.cardRight}>
          <Text style={s.amount}>
            ₹{Number(order.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
          <View style={[s.badge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[s.badgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
        </View>
      </View>
      {order.paymentMethod ? (
        <Text style={s.method}>via {order.paymentMethod}</Text>
      ) : null}
    </TouchableOpacity>
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
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardLeft: {
    flex: 1,
    gap: 3,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  refType: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  orderId: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  desc: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  method: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 6,
  },
});
