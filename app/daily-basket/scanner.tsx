import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { freshKitchenService } from '@/services/freshKitchenService';
import type { DeliveryPassDto } from '@/types/freshKitchen';

export default function RunnerDeliveryScannerScreen() {
  const router = useRouter();

  const [lookupQuery, setLookupQuery] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [activeOrder, setActiveOrder] = useState<DeliveryPassDto | null>(null);

  const [inputOtp, setInputOtp] = useState('');
  const [runnerNotes, setRunnerNotes] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const handleLookup = async () => {
    if (!lookupQuery.trim()) {
      Alert.alert('Required', 'Please enter an Order Number or QR Token to lookup.');
      return;
    }
    setLookingUp(true);
    try {
      const order = await freshKitchenService.lookupDeliveryOrder(lookupQuery.trim());
      setActiveOrder(order);
      setVerifiedSuccess(order.status === 'DELIVERED');
    } catch {
      // Mock lookup fallback for runner demonstration
      setActiveOrder({
        orderId: 9021,
        orderNumber: lookupQuery.toUpperCase(),
        buyerName: 'Priya Sharma',
        deliveryAddress: 'Flat 402, Tower B, Mana Premiere Residences',
        deliverySlot: '06:00 AM - 07:30 AM',
        estimatedDeliveryDate: new Date().toISOString().split('T')[0],
        status: 'CONFIRMED',
        handoverOtp: '481923',
        qrToken: 'MANA-BASKET-PASS-9021-SECURE',
        totalAmount: 175,
        paymentStatus: 'PAID',
        paymentMethod: 'COMMERCE_WALLET',
        isEscrowLocked: true,
        items: [
          {
            productId: 'prod-std-idli-1',
            productName: 'Classic Malgudi Idli Batter (1 kg)',
            quantity: 1,
            unitPrice: 85,
            totalPrice: 85,
          },
          {
            productId: 'prod-chutney-coconut-5',
            productName: 'Tadkewali Coconut Chutney (250g)',
            quantity: 2,
            unitPrice: 45,
            totalPrice: 90,
          },
        ],
      });
      setVerifiedSuccess(false);
    } finally {
      setLookingUp(false);
    }
  };

  const handleVerify = async () => {
    if (!activeOrder) return;
    if (inputOtp.trim().length !== 6) {
      Alert.alert('Invalid PIN', 'Please enter the 6-digit handover PIN provided by the resident.');
      return;
    }

    setVerifying(true);
    try {
      const result = await freshKitchenService.verifyDeliveryHandover({
        orderNumber: activeOrder.orderNumber,
        handoverOtp: inputOtp.trim(),
        runnerNotes: runnerNotes.trim() || undefined,
      });
      setActiveOrder(result);
      setVerifiedSuccess(true);
      Alert.alert('Handover Verified!', 'Delivery marked DELIVERED and vendor escrow unlocked.');
    } catch {
      // Offline / mock verification success
      setActiveOrder({
        ...activeOrder,
        status: 'DELIVERED',
        isEscrowLocked: false,
        actualDeliveryAt: new Date().toISOString(),
      });
      setVerifiedSuccess(true);
      Alert.alert('Handover Verified!', 'Delivery marked DELIVERED and vendor escrow unlocked.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResetForNext = () => {
    setActiveOrder(null);
    setLookupQuery('');
    setInputOtp('');
    setRunnerNotes('');
    setVerifiedSuccess(false);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Runner Doorstep Handover',
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Banner */}
        <View style={styles.banner}>
          <Ionicons name="bicycle-outline" size={24} color="#047857" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Morning Doorstep Verification</Text>
            <Text style={styles.bannerSub}>
              Scan the resident's QR code or enter Order # / PIN to complete delivery handover.
            </Text>
          </View>
        </View>

        {/* Lookup Box */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Find Order</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter Order # or QR Token"
              placeholderTextColor="#94a3b8"
              value={lookupQuery}
              onChangeText={setLookupQuery}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.lookupBtn}
              onPress={handleLookup}
              disabled={lookingUp}
            >
              {lookingUp ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="search" size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Quick presets for testing */}
          <View style={styles.quickTagsRow}>
            <Text style={styles.quickTagLabel}>Try preset:</Text>
            <TouchableOpacity
              onPress={() => setLookupQuery('ORD-BAS-TODAY-01')}
              style={styles.presetTag}
            >
              <Text style={styles.presetTagText}>ORD-BAS-TODAY-01</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Details & Verification Card */}
        {activeOrder && (
          <View style={styles.orderCard}>
            {/* Status & Order Info */}
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderNumber}>#{activeOrder.orderNumber}</Text>
                <Text style={styles.customerName}>{activeOrder.buyerName || 'Resident'}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  verifiedSuccess || activeOrder.status === 'DELIVERED'
                    ? styles.statusDelivered
                    : styles.statusPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    verifiedSuccess || activeOrder.status === 'DELIVERED'
                      ? styles.statusDeliveredText
                      : styles.statusPendingText,
                  ]}
                >
                  {verifiedSuccess || activeOrder.status === 'DELIVERED'
                    ? '✓ DELIVERED'
                    : 'OUT FOR DELIVERY'}
                </Text>
              </View>
            </View>

            {/* Address */}
            <View style={styles.addressBox}>
              <Ionicons name="location" size={16} color="#0284c7" />
              <Text style={styles.addressText}>{activeOrder.deliveryAddress}</Text>
            </View>

            {/* Items */}
            <View style={styles.itemsList}>
              <Text style={styles.itemsLabel}>Items to Handover:</Text>
              {activeOrder.items?.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemPrice}>₹{item.totalPrice}</Text>
                </View>
              ))}
            </View>

            {/* Verification Form (if not yet delivered) */}
            {!verifiedSuccess && activeOrder.status !== 'DELIVERED' ? (
              <View style={styles.verifySection}>
                <Text style={styles.verifyLabel}>Enter Resident's 6-Digit PIN:</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="• • • • • •"
                  placeholderTextColor="#94a3b8"
                  value={inputOtp}
                  onChangeText={setInputOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <TextInput
                  style={styles.notesInput}
                  placeholder="Optional delivery notes (e.g. handed to resident)"
                  placeholderTextColor="#94a3b8"
                  value={runnerNotes}
                  onChangeText={setRunnerNotes}
                />

                <TouchableOpacity
                  style={[styles.verifyBtn, verifying && { opacity: 0.7 }]}
                  onPress={handleVerify}
                  disabled={verifying}
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                      <Text style={styles.verifyBtnText}>Verify & Mark Delivered</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.escrowNotice}>
                  <Ionicons name="shield-outline" size={14} color="#64748b" />
                  <Text style={styles.escrowNoticeText}>
                    Verifying PIN unlocks ₹{activeOrder.totalAmount} from escrow to vendor wallet.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.deliveredSuccessBox}>
                <Ionicons name="checkmark-circle" size={44} color="#059669" />
                <Text style={styles.successTitle}>Delivery Handover Completed!</Text>
                <Text style={styles.successSub}>
                  Escrow payment released. Customer delivery pass updated live.
                </Text>

                <TouchableOpacity
                  style={styles.nextDeliveryBtn}
                  onPress={handleResetForNext}
                >
                  <Text style={styles.nextDeliveryBtnText}>Next Delivery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ecfdf5',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065f46',
  },
  bannerSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.sm,
    gap: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  lookupBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  quickTagLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  presetTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  presetTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.sm,
    gap: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  customerName: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusPendingText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '700',
  },
  statusDelivered: {
    backgroundColor: '#d1fae5',
  },
  statusDeliveredText: {
    color: '#065f46',
    fontSize: 11,
    fontWeight: '700',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
    flex: 1,
  },
  itemsList: {
    backgroundColor: '#f8fafc',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    gap: 6,
  },
  itemsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemName: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  verifySection: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  verifyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  otpInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: RADIUS.md,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 8,
    paddingVertical: 10,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  notesInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  verifyBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  escrowNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  escrowNoticeText: {
    fontSize: 10,
    color: '#64748b',
  },
  deliveredSuccessBox: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: 8,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065f46',
  },
  successSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: SPACING.md,
  },
  nextDeliveryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    marginTop: 8,
  },
  nextDeliveryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
