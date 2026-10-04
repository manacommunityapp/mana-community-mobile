import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import QRPickupPass from '@/components/group-buying/QRPickupPass';
import type { GroupOrderDto, AuthorizedCollector } from '@/types/groupBuying';

export default function PickupPassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [collectors, setCollectors] = useState<AuthorizedCollector[]>([]);
  const [showAddCollectorModal, setShowAddCollectorModal] = useState(false);
  const [collectorName, setCollectorName] = useState('');
  const [collectorRelation, setCollectorRelation] = useState('Family / Friend');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: groupBuyingService.getMyOrders,
  });

  const order = useMemo(() => {
    return orders.find(o => o.id === id) ?? (orders.length > 0 ? orders[0] : null);
  }, [orders, id]);

  const handleSharePass = async () => {
    if (!order) return;
    try {
      await Share.share({
        message: `Mana Group Buy Pickup Pass
Order: ${order.id}
Product: ${order.title}
Quantity: ${order.qty}
Total: ?${order.total}
Pickup Location: ${order.pickupPoint ?? 'Clubhouse Desk'}
QR Code Reference: ${order.qrCode}`,
      });
    } catch (e) {
      console.log('Share error', e);
    }
  };

  const handleCreateCollectorPin = () => {
    if (!collectorName.trim()) {
      Alert.alert('Required', 'Please enter collector name.');
      return;
    }

    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const newCollector: AuthorizedCollector = {
      id: `col-${Date.now()}`,
      name: collectorName.trim(),
      relationship: collectorRelation,
      authPin: pin,
      expiresAt: 'Expires at pickup close (7:00 PM)',
    };

    setCollectors(prev => [...prev, newCollector]);
    setShowAddCollectorModal(false);
    setCollectorName('');

    Alert.alert(
      'Pickup PIN Generated',
      `Temporary PIN ${pin} generated for ${newCollector.name}. They can show this PIN to the clubhouse staff to collect your items.`
    );
  };

  const handleShareCollectorPin = async (col: AuthorizedCollector) => {
    if (!order) return;
    try {
      await Share.share({
        message: `Mana Group Buy Pickup Authorization
For: ${order.title} (Order ${order.id})
Authorized Collector: ${col.name}
Pickup PIN: ${col.authPin}
Location: ${order.pickupPoint ?? 'Clubhouse Desk'}`,
      });
    } catch (e) {
      console.log('Share pin error', e);
    }
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading pickup pass...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
        <Text style={s.errorTitle}>Order Not Found</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Digital Pickup Pass',
          headerRight: () => (
            <TouchableOpacity onPress={handleSharePass} style={s.headerShareBtn}>
              <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Main Signed QR Card */}
        <QRPickupPass order={order} />

        {/* Pickup Location & Hours Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="business-outline" size={20} color={COLORS.primary} />
            <Text style={s.cardTitle}>Pickup Desk Information</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Desk Location:</Text>
            <Text style={s.infoValue}>{order.pickupPoint ?? 'Clubhouse Ground Floor Desk'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Date & Time:</Text>
            <Text style={s.infoValue}>
              {order.pickupDate ?? 'Today'} {order.pickupSlot ? ' ? ' + order.pickupSlot : ' ? 10 AM ? 7 PM'}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Desk Contact:</Text>
            <Text style={s.infoValue}>Mana Facility Desk (+91 98765 43210)</Text>
          </View>
        </View>

        {/* Split Pickup / Authorized Collector */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="people-outline" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Split Pickup / Helper Delegation</Text>
              <Text style={s.cardSub}>
                Cannot collect yourself? Generate a temporary one-time PIN for a family member or helper.
              </Text>
            </View>
          </View>

          {collectors.length > 0 && (
            <View style={s.collectorsList}>
              {collectors.map(col => (
                <View key={col.id} style={s.collectorCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.collectorName}>{col.name}</Text>
                    <Text style={s.collectorRelation}>{col.relationship} ? {col.expiresAt}</Text>
                  </View>
                  <View style={s.pinWrap}>
                    <Text style={s.pinLabel}>PIN</Text>
                    <Text style={s.pinValue}>{col.authPin}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.sharePinBtn}
                    onPress={() => handleShareCollectorPin(col)}
                  >
                    <Ionicons name="share-outline" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={s.addCollectorBtn}
            onPress={() => setShowAddCollectorModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add-outline" size={16} color={COLORS.primary} />
            <Text style={s.addCollectorBtnText}>+ Authorize Someone to Collect</Text>
          </TouchableOpacity>
        </View>

        {/* Pickup Verification Instructions */}
        <View style={s.instructionsCard}>
          <Text style={s.instHeading}>HOW PICKUP WORKS</Text>
          <View style={s.stepRow}>
            <View style={s.stepNum}><Text style={s.stepNumText}>1</Text></View>
            <Text style={s.stepText}>Reach the clubhouse desk during your pickup window.</Text>
          </View>
          <View style={s.stepRow}>
            <View style={s.stepNum}><Text style={s.stepNumText}>2</Text></View>
            <Text style={s.stepText}>Show the QR pass on this screen or share the temporary PIN.</Text>
          </View>
          <View style={s.stepRow}>
            <View style={s.stepNum}><Text style={s.stepNumText}>3</Text></View>
            <Text style={s.stepText}>Staff scans the cryptographic token and hands over your fresh items.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Collector Modal */}
      <Modal visible={showAddCollectorModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Authorize Pickup Person</Text>
              <TouchableOpacity
                onPress={() => setShowAddCollectorModal(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.modalBody}>
              <Text style={s.inputLabel}>Collector Full Name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Ramesh (Helper) or Sunita (Sister)"
                placeholderTextColor={COLORS.textMuted}
                value={collectorName}
                onChangeText={setCollectorName}
              />

              <Text style={s.inputLabel}>Relationship / Role</Text>
              <View style={s.relationPills}>
                {['Family', 'Helper / Maid', 'Neighbour', 'Driver'].map(rel => (
                  <TouchableOpacity
                    key={rel}
                    style={[
                      s.relationPill,
                      collectorRelation === rel && s.relationPillActive,
                    ]}
                    onPress={() => setCollectorRelation(rel)}
                  >
                    <Text
                      style={[
                        s.relationPillText,
                        collectorRelation === rel && s.relationPillTextActive,
                      ]}
                    >
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={s.generatePinBtn}
              onPress={handleCreateCollectorPin}
              activeOpacity={0.85}
            >
              <Ionicons name="key-outline" size={18} color="#FFFFFF" />
              <Text style={s.generatePinBtnText}>Generate One-Time PIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  headerShareBtn: {
    marginRight: 8,
    padding: 6,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceAlt,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  collectorsList: {
    gap: 8,
    marginVertical: 4,
  },
  collectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    gap: 10,
  },
  collectorName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  collectorRelation: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  pinWrap: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#166534',
  },
  pinValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#166534',
  },
  sharePinBtn: {
    padding: 6,
  },
  addCollectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addCollectorBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  instructionsCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 10,
  },
  instHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  relationPills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  relationPill: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  relationPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  relationPillText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  relationPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  generatePinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    marginTop: 6,
  },
  generatePinBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
