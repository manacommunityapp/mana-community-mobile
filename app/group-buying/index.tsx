import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';

interface Deal {
  id: string;
  title: string;
  category: string;
  description: string;
  currentParticipants: number;
  targetParticipants: number;
  currentPrice: number;
  standardPrice: number;
  vendor: string;
  vendorRating: number;
  daysLeft: number;
  pickupPoint: string;
}

const SAMPLE_DEALS: Deal[] = [
  {
    id: 'deal-1',
    title: 'Fresh Farm Organic Produce Box (5kg)',
    category: 'Groceries',
    description: 'Weekly farm-to-door organic vegetables sourced directly from certified farms.',
    currentParticipants: 34,
    targetParticipants: 50,
    currentPrice: 750,
    standardPrice: 950,
    vendor: 'Green Earth Farms',
    vendorRating: 4.8,
    daysLeft: 2,
    pickupPoint: 'Tower A Clubhouse Entrance',
  },
  {
    id: 'deal-2',
    title: 'Premium Cold-Pressed A2 Desi Ghee (1L)',
    category: 'Daily Essentials',
    description: 'Bilona method pure Gir cow A2 ghee with lab certificate test.',
    currentParticipants: 28,
    targetParticipants: 40,
    currentPrice: 1450,
    standardPrice: 1850,
    vendor: 'Vedic Cow Farms',
    vendorRating: 4.9,
    daysLeft: 4,
    pickupPoint: 'Society Main Gate Parcel Desk',
  },
  {
    id: 'deal-3',
    title: 'Society Festive Sweets Assortment (1kg)',
    category: 'Sweets & Snacks',
    description: 'Handcrafted Kaju Katli, Motichoor Ladoo & Dry Fruit Barfi gift box.',
    currentParticipants: 62,
    targetParticipants: 75,
    currentPrice: 680,
    standardPrice: 900,
    vendor: 'Anand Sweets',
    vendorRating: 4.7,
    daysLeft: 6,
    pickupPoint: 'Clubhouse Ground Floor',
  },
];

export default function GroupBuyingScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'deals' | 'orders' | 'demand'>('deals');
  const [deals, setDeals] = useState<Deal[]>(SAMPLE_DEALS);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isJoining, setIsJoining] = useState(false);
  const [orders, setOrders] = useState<Array<{ id: string; title: string; qty: number; total: number; qr: string }>>([
    { id: 'ORD-8821', title: 'Fresh Farm Organic Produce Box (5kg)', qty: 1, total: 750, qr: 'QR-DEAL-001-A1204' },
  ]);
  const [qrModal, setQrModal] = useState<string | null>(null);

  const handleJoinDeal = () => {
    if (!selectedDeal) return;
    setIsJoining(true);
    setTimeout(() => {
      setIsJoining(false);
      const newOrder = {
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        title: selectedDeal.title,
        qty: quantity,
        total: selectedDeal.currentPrice * quantity,
        qr: `QR-${selectedDeal.id.toUpperCase()}-${user?.flatNumber || 'UNIT'}-${Date.now().toString().slice(-4)}`,
      };
      setOrders([newOrder, ...orders]);
      setSelectedDeal(null);
      setQuantity(1);
      setActiveTab('orders');
      Alert.alert('🎉 Joined Group Deal', 'Your order has been recorded! Show your pickup QR code upon delivery.');
    }, 800);
  };

  return (
    <View style={styles.container}>
      {/* ── Tabs ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'deals' && styles.tabItemActive]}
          onPress={() => setActiveTab('deals')}
        >
          <Text style={[styles.tabText, activeTab === 'deals' && styles.tabTextActive]}>Active Deals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            My Orders ({orders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'demand' && styles.tabItemActive]}
          onPress={() => setActiveTab('demand')}
        >
          <Text style={[styles.tabText, activeTab === 'demand' && styles.tabTextActive]}>Demand Board</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── TAB 1: Deals ── */}
        {activeTab === 'deals' && (
          <View style={{ gap: SPACING.lg }}>
            {deals.map((deal) => {
              const progress = Math.min(1, deal.currentParticipants / deal.targetParticipants);
              return (
                <View key={deal.id} style={styles.dealCard}>
                  {/* Category & Badge */}
                  <View style={styles.dealHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{deal.category}</Text>
                    </View>
                    <View style={styles.timerBadge}>
                      <Ionicons name="time-outline" size={12} color="#D97706" />
                      <Text style={styles.timerText}>{deal.daysLeft}d left</Text>
                    </View>
                  </View>

                  <Text style={styles.dealTitle}>{deal.title}</Text>
                  <Text style={styles.dealDesc}>{deal.description}</Text>

                  {/* Price Row */}
                  <View style={styles.priceRow}>
                    <View>
                      <Text style={styles.priceLabel}>Group Price</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACING.xs }}>
                        <Text style={styles.priceCurrent}>₹{deal.currentPrice}</Text>
                        <Text style={styles.priceOriginal}>₹{deal.standardPrice}</Text>
                      </View>
                    </View>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>
                        Save {Math.round(((deal.standardPrice - deal.currentPrice) / deal.standardPrice) * 100)}%
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressText}>
                        👥 {deal.currentParticipants} Neighbours joined
                      </Text>
                      <Text style={styles.progressGoal}>Goal: {deal.targetParticipants}</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                    </View>
                  </View>

                  {/* Vendor & Pickup */}
                  <View style={styles.vendorRow}>
                    <Text style={styles.vendorText}>By {deal.vendor} (★ {deal.vendorRating})</Text>
                    <Text style={styles.pickupText}>📍 {deal.pickupPoint}</Text>
                  </View>

                  {/* CTA */}
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => {
                      setSelectedDeal(deal);
                      setQuantity(1);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.joinButtonText}>Join Deal for ₹{deal.currentPrice} →</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* ── TAB 2: Orders ── */}
        {activeTab === 'orders' && (
          <View style={{ gap: SPACING.md }}>
            {orders.map((ord) => (
              <View key={ord.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>{ord.id}</Text>
                  <View style={styles.confirmedBadge}>
                    <Text style={styles.confirmedText}>CONFIRMED</Text>
                  </View>
                </View>
                <Text style={styles.orderTitle}>{ord.title}</Text>
                <View style={styles.orderDetailRow}>
                  <Text style={styles.orderDetailText}>Qty: {ord.qty}</Text>
                  <Text style={styles.orderTotalText}>Total: ₹{ord.total}</Text>
                </View>
                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => setQrModal(ord.qr)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="qr-code-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.qrButtonText}>View Pickup QR Code</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── TAB 3: Demand Board ── */}
        {activeTab === 'demand' && (
          <View style={{ gap: SPACING.md }}>
            <View style={styles.demandIntro}>
              <Ionicons name="bulb-outline" size={20} color="#7C3AED" />
              <Text style={styles.demandIntroText}>
                Upvote products you want community vendors to supply at bulk group discounts.
              </Text>
            </View>

            {[
              { title: 'A2 Vedic Bilona Butter (500g)', upvotes: 18, category: 'Dairy' },
              { title: 'Kashmir Saffron Grade 1 (5g pack)', upvotes: 12, category: 'Spices' },
              { title: 'Community Car Wash Service Deal', upvotes: 24, category: 'Services' },
            ].map((d, i) => (
              <View key={i} style={styles.demandCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.demandBadge}>{d.category}</Text>
                  <Text style={styles.demandTitle}>{d.title}</Text>
                </View>
                <TouchableOpacity
                  style={styles.upvoteButton}
                  onPress={() => Alert.alert('Upvoted', 'Thank you for expressing interest!')}
                >
                  <Ionicons name="thumbs-up" size={14} color="#7C3AED" />
                  <Text style={styles.upvoteText}>{d.upvotes}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Join Deal Modal ── */}
      <Modal visible={!!selectedDeal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Group Deal</Text>
            <Text style={styles.modalSubtitle}>{selectedDeal?.title}</Text>

            <View style={styles.modalPriceBox}>
              <Text style={styles.modalPriceLabel}>Unit Price:</Text>
              <Text style={styles.modalPriceValue}>₹{selectedDeal?.currentPrice}</Text>
            </View>

            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Select Quantity:</Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(quantity + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total Payable:</Text>
              <Text style={styles.totalValue}>₹{(selectedDeal?.currentPrice || 0) * quantity}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSelectedDeal(null)}
                disabled={isJoining}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmJoinBtn}
                onPress={handleJoinDeal}
                disabled={isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmJoinText}>Confirm Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── QR Pass Modal ── */}
      <Modal visible={!!qrModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <Ionicons name="qr-code" size={120} color="#111827" />
            <Text style={styles.qrCodeText}>{qrModal}</Text>
            <Text style={styles.qrHint}>Present this digital pass at the pickup desk to claim your order.</Text>
            <TouchableOpacity
              style={[styles.cancelBtn, { width: '100%', marginTop: SPACING.lg }]}
              onPress={() => setQrModal(null)}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#059669' },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#059669', fontWeight: '700' },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  dealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  categoryBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  categoryText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  dealTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: SPACING.xs },
  dealDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 16 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.md,
  },
  priceLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  priceCurrent: { fontSize: 20, fontWeight: '800', color: '#059669' },
  priceOriginal: { fontSize: 13, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
  discountText: { fontSize: 11, fontWeight: '800', color: '#065F46' },
  progressContainer: { marginBottom: SPACING.md },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  progressGoal: { fontSize: 11, color: COLORS.textMuted },
  progressBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#059669', borderRadius: 3 },
  vendorRow: { flexDirection: 'column', gap: 2, marginBottom: SPACING.md },
  vendorText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  pickupText: { fontSize: 11, color: COLORS.textMuted },
  joinButton: { backgroundColor: '#059669', paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center' },
  joinButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, fontFamily: 'monospace' },
  confirmedBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  confirmedText: { fontSize: 10, fontWeight: '800', color: '#1D4ED8' },
  orderTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: SPACING.xs },
  orderDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: SPACING.sm },
  orderDetailText: { fontSize: 12, color: COLORS.textSecondary },
  orderTotalText: { fontSize: 14, fontWeight: '800', color: '#059669' },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  qrButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  demandIntro: {
    flexDirection: 'row',
    backgroundColor: '#F5F3FF',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  demandIntroText: { fontSize: 12, color: '#5B21B6', flex: 1, fontWeight: '500' },
  demandCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demandBadge: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  demandTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  upvoteText: { fontSize: 12, fontWeight: '800', color: '#7C3AED' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.md },
  modalPriceBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ECFDF5', padding: SPACING.md, borderRadius: RADIUS.md },
  modalPriceLabel: { fontSize: 12, color: '#065F46', fontWeight: '600' },
  modalPriceValue: { fontSize: 14, fontWeight: '800', color: '#059669' },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: SPACING.md },
  qtyLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  qtyValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md, marginBottom: SPACING.lg },
  totalLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#059669' },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  confirmJoinBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#059669', alignItems: 'center' },
  confirmJoinText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  qrCodeText: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: SPACING.md, fontFamily: 'monospace' },
  qrHint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
});
