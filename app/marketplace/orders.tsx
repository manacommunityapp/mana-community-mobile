import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceService } from '@/services/marketplaceService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'buying' | 'selling';

export default function MarketplaceOrdersScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('buying');

  // Verify OTP Modal state
  const [verifyingOrder, setVerifyingOrder] = useState<any | null>(null);
  const [inputOtp, setInputOtp] = useState('');

  const { data: myOrdersData, isLoading: loadingMy, refetch: refetchMy, isRefetching: refetchingMy } = useQuery({
    queryKey: ['marketplace', 'orders', 'my'],
    queryFn: () => marketplaceService.getMyOrders(0),
    enabled: tab === 'buying',
  });

  const { data: sellerOrdersData, isLoading: loadingSeller, refetch: refetchSeller, isRefetching: refetchingSeller } = useQuery({
    queryKey: ['marketplace', 'orders', 'seller'],
    queryFn: () => marketplaceService.getSellerOrders(0),
    enabled: tab === 'selling',
  });

  const orders = (tab === 'buying' ? myOrdersData?.content : sellerOrdersData?.content) ?? [];
  const isLoading = tab === 'buying' ? loadingMy : loadingSeller;
  const isRefetching = tab === 'buying' ? refetchingMy : refetchingSeller;

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      marketplaceService.updateOrderStatus(orderId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace', 'orders'] });
      Alert.alert('Status Updated', 'The order status was updated successfully.');
    },
    onError: () => Alert.alert('Error', 'Failed to update order status.'),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: ({ orderId, otp }: { orderId: number; otp: string }) =>
      marketplaceService.verifyPickupOtp(orderId, otp),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace', 'orders'] });
      setVerifyingOrder(null);
      setInputOtp('');
      Alert.alert('Handover Complete', 'Pickup OTP verified! Item marked as handed over.');
    },
    onError: () => Alert.alert('Verification Failed', 'Invalid OTP or unable to verify with gate security.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (orderId: number) => marketplaceService.cancelOrder(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace', 'orders'] });
      Alert.alert('Order Cancelled', 'The order was cancelled.');
    },
    onError: () => Alert.alert('Error', 'Unable to cancel this order.'),
  });

  const renderOrder = ({ item: order }: { item: any }) => {
    const isCompleted = order.status === 'COMPLETED';
    const isCancelled = order.status === 'CANCELLED';
    const hasGateOtp = !!order.pickupOtp;

    return (
      <View style={s.orderCard}>
        {/* Top order header */}
        <View style={s.cardHeader}>
          <View>
            <Text style={s.orderNumber}>Order #{order.orderNumber || order.id}</Text>
            <Text style={s.orderDate}>
              {order.createdAt ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true }) : 'Recent'}
            </Text>
          </View>
          <View style={[s.statusBadge, isCompleted && s.statusCompleted, isCancelled && s.statusCancelled]}>
            <Text style={[s.statusText, isCompleted && s.statusTextCompleted, isCancelled && s.statusTextCancelled]}>
              {order.status || 'PENDING'}
            </Text>
          </View>
        </View>

        {/* Items summary */}
        <View style={s.itemsWrap}>
          {(order.items || []).map((it: any, idx: number) => (
            <View key={idx} style={s.itemRow}>
              <Text style={s.itemTitle} numberOfLines={1}>{it.listingTitle || 'Product Item'}</Text>
              <Text style={s.itemQty}>x{it.quantity || 1}</Text>
              <Text style={s.itemPrice}>₹{(it.unitPrice || 0) * (it.quantity || 1)}</Text>
            </View>
          ))}
          {(!order.items || order.items.length === 0) && (
            <Text style={s.itemTitle}>Marketplace Listing Order</Text>
          )}
        </View>

        {/* Total & Party info */}
        <View style={s.partyRow}>
          <Text style={s.partyText}>
            {tab === 'buying' ? `Seller: ${order.seller?.fullName || 'Neighbor'}` : `Buyer: ${order.buyer?.fullName || 'Neighbor'}`}
          </Text>
          <Text style={s.totalAmount}>Total: ₹{order.totalAmount?.toLocaleString('en-IN') || 0}</Text>
        </View>

        {/* Gate Handover Pass with 4-Digit OTP */}
        {hasGateOtp && !isCompleted && !isCancelled && (
          <View style={s.passBox}>
            <View style={s.passIconBox}>
              <Ionicons name="key" size={18} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.passTitle}>Gate Security Handover Pass</Text>
              <Text style={s.passDesc}>
                {tab === 'buying'
                  ? 'Show this 4-digit PIN to security/clubhouse to collect.'
                  : 'Collect OTP from resident/guard upon handover.'}
              </Text>
            </View>
            <View style={s.otpPill}>
              <Text style={s.otpText}>{order.pickupOtp}</Text>
            </View>
          </View>
        )}

        {/* Seller Actions */}
        {tab === 'selling' && !isCompleted && !isCancelled && (
          <View style={s.actionsRow}>
            {order.status === 'PENDING' && (
              <TouchableOpacity
                style={[s.btnAction, { backgroundColor: '#3B82F6' }]}
                onPress={() => updateStatusMutation.mutate({ orderId: order.id, status: 'CONFIRMED' })}
              >
                <Text style={s.btnActionText}>Confirm Order</Text>
              </TouchableOpacity>
            )}
            {order.status === 'CONFIRMED' && (
              <TouchableOpacity
                style={[s.btnAction, { backgroundColor: '#8B5CF6' }]}
                onPress={() => updateStatusMutation.mutate({ orderId: order.id, status: 'DELIVERED' })}
              >
                <Text style={s.btnActionText}>Drop at Gate / In-Transit</Text>
              </TouchableOpacity>
            )}
            {hasGateOtp && (
              <TouchableOpacity
                style={[s.btnAction, { backgroundColor: '#10B981' }]}
                onPress={() => setVerifyingOrder(order)}
              >
                <Text style={s.btnActionText}>Verify OTP</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.btnAction, { backgroundColor: '#EF4444' }]}
              onPress={() => {
                Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(order.id) },
                ]);
              }}
            >
              <Text style={s.btnActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Top Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Marketplace Orders</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabStrip}>
        <TouchableOpacity
          style={[s.tabItem, tab === 'buying' && s.tabItemActive]}
          onPress={() => setTab('buying')}
          activeOpacity={0.7}
        >
          <Text style={[s.tabText, tab === 'buying' && s.tabTextActive]}>My Purchases</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabItem, tab === 'selling' && s.tabItemActive]}
          onPress={() => setTab('selling')}
          activeOpacity={0.7}
        >
          <Text style={[s.tabText, tab === 'selling' && s.tabTextActive]}>Sales Orders</Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadingText}>Loading orders…</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id || item.orderNumber)}
          renderItem={renderOrder}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={tab === 'buying' ? refetchMy : refetchSeller}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Ionicons name="receipt-outline" size={36} color="#6366F1" />
              </View>
              <Text style={s.emptyTitle}>No Orders Found</Text>
              <Text style={s.emptySub}>
                {tab === 'buying'
                  ? 'Orders placed for marketplace products will appear here with gate pass tracking.'
                  : 'Orders received for your listings will appear here for handover management.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Verify Gate OTP Modal */}
      <Modal visible={!!verifyingOrder} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Verify Gate Pickup OTP</Text>
              <TouchableOpacity onPress={() => setVerifyingOrder(null)} hitSlop={8}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalDesc}>
              Ask the receiving resident or security guard for their 4-digit handover PIN.
            </Text>
            <TextInput
              style={s.otpInput}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="4-digit OTP"
              value={inputOtp}
              onChangeText={setInputOtp}
              autoFocus
            />
            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setVerifyingOrder(null)}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirmBtn, inputOtp.length < 4 && { opacity: 0.5 }]}
                disabled={inputOtp.length < 4 || verifyOtpMutation.isPending}
                onPress={() => {
                  if (verifyingOrder) {
                    verifyOtpMutation.mutate({ orderId: verifyingOrder.id, otp: inputOtp });
                  }
                }}
              >
                <Text style={s.modalConfirmText}>
                  {verifyOtpMutation.isPending ? 'Verifying…' : 'Confirm Handover'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  tabStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
    fontFamily: FONTS.semiBold,
  },
  listContent: {
    padding: 14,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    gap: 10,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  orderDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    fontFamily: FONTS.semiBold,
  },
  statusTextCompleted: {
    color: '#059669',
  },
  statusTextCancelled: {
    color: '#DC2626',
  },
  itemsWrap: {
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  itemQty: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginHorizontal: 8,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  partyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  partyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: FONTS.displayBold,
  },
  passBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  passIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
    fontFamily: FONTS.semiBold,
  },
  passDesc: {
    fontSize: 10,
    color: '#6366F1',
    marginTop: 1,
  },
  otpPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  otpText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#4338CA',
    letterSpacing: 2,
    fontFamily: FONTS.displayBold,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  btnAction: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 36,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: FONTS.regular,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  modalDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  otpInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 6,
    color: COLORS.text,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
