import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { commerceCoreService } from '@/services/commerceCoreService';
import type { CommerceOrder, CommerceChannel } from '@/types/commerceCore';

const CHANNELS: { key: CommerceChannel | 'ALL'; label: string; color: string }[] = [
  { key: 'ALL', label: 'All', color: COLORS.primary },
  { key: 'GROUP_BUYING', label: 'Group Buy', color: '#F43F5E' },
  { key: 'FOOD', label: 'Food', color: '#F59E0B' },
  { key: 'MARKETPLACE', label: 'Market', color: '#3B82F6' },
  { key: 'DEALS', label: 'Deals', color: '#8B5CF6' },
  { key: 'VENDOR', label: 'Vendor', color: '#10B981' },
];

export default function ManaCommerceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<CommerceChannel | 'ALL'>('ALL');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [orderNum, setOrderNum] = useState('');
  const [pin, setPin] = useState('');

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['mana-commerce-orders'],
    queryFn: commerceCoreService.getMyOrders,
  });

  const verifyMutation = useMutation({
    mutationFn: commerceCoreService.verifyHandover,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['mana-commerce-orders'] });
      setShowVerifyModal(false);
      setOrderNum('');
      setPin('');
      alert(res.message);
    },
  });

  const filtered = orders.filter(
    (o: CommerceOrder) => selectedChannel === 'ALL' || o.channel === selectedChannel
  );

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.banner}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={12} color="#FBBF24" />
          <Text style={styles.badgeText}>Mana Commerce Platform</Text>
        </View>
        <Text style={styles.bannerTitle}>Universal Orders & Handover</Text>
        <Text style={styles.bannerSub}>Shared checkout, escrow, and PIN handover</Text>

        <TouchableOpacity style={styles.verifyBtn} onPress={() => setShowVerifyModal(true)}>
          <Ionicons name="key-outline" size={14} color="#FFFFFF" />
          <Text style={styles.verifyBtnText}>Verify Handover PIN</Text>
        </TouchableOpacity>
      </View>

      {/* Channel Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterStrip}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 6 }}
      >
        {CHANNELS.map((ch) => {
          const isActive = selectedChannel === ch.key;
          return (
            <TouchableOpacity
              key={ch.key}
              onPress={() => setSelectedChannel(ch.key)}
              style={[styles.filterChip, isActive && { backgroundColor: ch.color }]}
            >
              <Text style={[styles.filterChipText, isActive && { color: '#FFFFFF' }]}>{ch.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Orders List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[COLORS.primary]} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="bag-handle-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Commerce Orders</Text>
            <Text style={styles.emptySub}>Orders from Marketplace, Group Buy, and Food appear here.</Text>
          </View>
        ) : (
          filtered.map((ord: CommerceOrder) => (
            <View key={ord.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.channelBadge}>
                  <Text style={styles.channelText}>{ord.channel.replace(/_/g, ' ')}</Text>
                </View>
                <Text style={styles.statusText}>{ord.status}</Text>
              </View>

              <Text style={styles.orderNumber}>{ord.orderNumber}</Text>
              <Text style={styles.sellerName}>Seller: {ord.sellerName || 'Resident'}</Text>

              <View style={styles.itemsBox}>
                {ord.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemTitle}>{item.quantity}x {item.title}</Text>
                    <Text style={styles.itemPrice}>₹{item.totalPrice || item.unitPrice * item.quantity}</Text>
                  </View>
                ))}
              </View>

              {ord.handoverOtp && ord.status !== 'COMPLETED' && (
                <View style={styles.pinBox}>
                  <Text style={styles.pinLabel}>Handover PIN:</Text>
                  <Text style={styles.pinValue}>{ord.handoverOtp}</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.totalText}>Total: ₹{ord.totalAmount}</Text>
                <Text style={styles.fulfillmentText}>
                  {ord.fulfillmentType === 'DELIVERY' ? '🚚 Doorstep' : '🏢 Lobby Pickup'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Verify Handover Modal */}
      <Modal visible={showVerifyModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify Handover PIN</Text>
            <Text style={styles.modalSub}>Enter buyer's 6-digit PIN to release order & escrow.</Text>

            <TextInput
              placeholder="Order Number (e.g. ORD-123456)"
              value={orderNum}
              onChangeText={setOrderNum}
              style={styles.input}
              placeholderTextColor="#94A3B8"
            />

            <TextInput
              placeholder="6-Digit PIN"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, { letterSpacing: 4, fontWeight: '700' }]}
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => verifyMutation.mutate({ orderNumber: orderNum, enteredOtp: pin })}
            >
              <Text style={styles.submitBtnText}>Verify & Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowVerifyModal(false)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  banner: { backgroundColor: '#064E3B', padding: SPACING.md, paddingTop: SPACING.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  badgeText: { color: '#A7F3D0', fontSize: 10, fontWeight: '700' },
  bannerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: '#6EE7B7', fontSize: 12, marginTop: 2, marginBottom: 10 },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  verifyBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  filterStrip: { backgroundColor: '#FFFFFF', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  filterChip: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  filterChipText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  list: { flex: 1 },
  listContent: { padding: SPACING.md },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  channelBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  channelText: { fontSize: 10, fontWeight: '800', color: '#065F46' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  orderNumber: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  sellerName: { fontSize: 11, color: '#64748B', marginBottom: 6 },
  itemsBox: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: RADIUS.sm, marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  itemTitle: { fontSize: 11, color: '#334155' },
  itemPrice: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  pinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: RADIUS.sm,
    marginBottom: 8,
  },
  pinLabel: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  pinValue: { fontSize: 14, fontWeight: '800', color: '#92400E', letterSpacing: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#F1F5F9', paddingTop: 8 },
  totalText: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  fulfillmentText: { fontSize: 11, color: '#64748B' },
  emptyWrap: { alignItems: 'center', marginTop: 60, padding: SPACING.lg },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginBottom: 16 },
  input: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: RADIUS.md, fontSize: 13, color: '#0F172A', marginBottom: 10 },
  submitBtn: { backgroundColor: '#059669', padding: 12, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 6 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  closeBtn: { padding: 12, alignItems: 'center' },
  closeBtnText: { color: '#64748B', fontWeight: '700' },
});
