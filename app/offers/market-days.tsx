import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { offersService } from '@/services/offersService';
import type { FarmersMarketDay, MarketVendor } from '@/types/offers';

export default function MarketDaysScreen() {
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedVendorModal, setSelectedVendorModal] = useState<MarketVendor | null>(null);
  const [showStallBookingModal, setShowStallBookingModal] = useState(false);

  // Stall booking form
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorCategory, setVendorCategory] = useState('ORGANIC_VEGGIES');
  const [vendorProducts, setVendorProducts] = useState('');

  const { data: marketDays = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['farmersMarketDays'],
    queryFn: offersService.getMarketDays,
  });

  const rsvpMutation = useMutation({
    mutationFn: (marketId: string) => offersService.rsvpMarketDay(marketId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmersMarketDays'] });
    },
  });

  const stallMutation = useMutation({
    mutationFn: (data: { marketId: string; vendorName: string; category: string; phone: string; products: string }) =>
      offersService.bookVendorStall(data),
    onSuccess: () => {
      setShowStallBookingModal(false);
      setVendorName('');
      setVendorPhone('');
      setVendorProducts('');
      Alert.alert('Application Submitted!', 'Society Estate & Welfare team will review your stall application within 24 hours.');
    },
  });

  const primaryMarket = marketDays[0];

  const filteredVendors = (primaryMarket?.vendors || []).filter((v) => {
    if (selectedCategory === 'ALL') return true;
    return v.category === selectedCategory;
  });

  const categoryOptions = [
    { label: 'All Stalls', value: 'ALL', icon: 'apps-outline' },
    { label: '🥬 Farm Fresh', value: 'ORGANIC_VEGGIES', icon: 'leaf-outline' },
    { label: '🥖 Artisan Bakery', value: 'BAKERY', icon: 'cafe-outline' },
    { label: '🥛 Native Dairy & Honey', value: 'FARM_DAIRY', icon: 'water-outline' },
    { label: '🌱 Balcony Nursery', value: 'PLANTS_NURSERY', icon: 'flower-outline' },
    { label: '🌰 Gourmet Dryfruits', value: 'SPECIALTY_FOOD', icon: 'nutrition-outline' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : (
          <>
            {/* ── Active / Upcoming Market Hero ───────────────────────── */}
            {primaryMarket && (
              <View style={styles.heroCard}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.statusPill}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.statusPillText}>
                      {primaryMarket.status === 'LIVE_NOW' ? '🔴 LIVE NOW' : '🗓️ THIS WEEKEND'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.rsvpBtn, primaryMarket.userRsvp && styles.rsvpBtnActive]}
                    onPress={() => rsvpMutation.mutate(primaryMarket.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={primaryMarket.userRsvp ? 'checkmark-circle' : 'calendar-outline'}
                      size={14}
                      color={primaryMarket.userRsvp ? '#065F46' : '#FFFFFF'}
                    />
                    <Text style={[styles.rsvpBtnText, primaryMarket.userRsvp && styles.rsvpBtnTextActive]}>
                      {primaryMarket.userRsvp ? 'RSVP Confirmed' : 'I will attend'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.heroTitle}>{primaryMarket.title}</Text>
                <Text style={styles.heroTheme}>{primaryMarket.theme}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color="#A7F3D0" />
                    <Text style={styles.metaText}>{primaryMarket.time}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color="#A7F3D0" />
                    <Text style={styles.metaText}>{primaryMarket.location}</Text>
                  </View>
                </View>

                {/* Society Highlights */}
                <View style={styles.highlightBox}>
                  <Text style={styles.highlightHead}>Society Exclusive Features</Text>
                  {primaryMarket.highlights.map((h, i) => (
                    <Text key={i} style={styles.highlightItem}>
                      • {h}
                    </Text>
                  ))}
                </View>

                {/* RSVP Counter & CTA */}
                <View style={styles.heroFooter}>
                  <View style={styles.attendeePills}>
                    <Ionicons name="people" size={15} color="#FDE68A" />
                    <Text style={styles.attendeeText}>{primaryMarket.rsvpCount} Neighbors Attending</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.bookStallMiniBtn}
                    onPress={() => setShowStallBookingModal(true)}
                  >
                    <Ionicons name="storefront-outline" size={13} color="#D1FAE5" />
                    <Text style={styles.bookStallMiniText}>Put Up a Stall</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Category Filter Pills ───────────────────────────────── */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Confirmed Farmers & Vendor Stalls</Text>
                <Text style={styles.sectionSub}>Pre-order directly or pick up fresh at the clubhouse lawn</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              {categoryOptions.map((opt) => {
                const isSel = selectedCategory === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.catPill, isSel && styles.catPillSelected]}
                    onPress={() => setSelectedCategory(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={13}
                      color={isSel ? '#FFFFFF' : COLORS.textSecondary}
                    />
                    <Text style={[styles.catPillText, isSel && styles.catPillTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Vendor Stalls List ──────────────────────────────────── */}
            <View style={styles.vendorList}>
              {filteredVendors.map((vendor) => (
                <View key={vendor.id} style={styles.vendorCard}>
                  <View style={styles.vendorHeader}>
                    <View style={styles.stallPill}>
                      <Text style={styles.stallPillText}>{vendor.stallNumber}</Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#D97706" />
                      <Text style={styles.ratingText}>{vendor.rating}</Text>
                      <Text style={styles.reviewCountText}>({vendor.reviewCount})</Text>
                    </View>
                  </View>

                  <Text style={styles.vendorName}>{vendor.name}</Text>
                  <Text style={styles.vendorTagline}>🌱 {vendor.tagline}</Text>
                  <Text style={styles.vendorDesc}>{vendor.description}</Text>

                  {/* Popular Items Chips */}
                  <View style={styles.itemChipsRow}>
                    {vendor.popularItems.map((item, idx) => (
                      <View key={idx} style={styles.itemChip}>
                        <Text style={styles.itemChipText}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Special Society Perk */}
                  {vendor.specialSocietyDiscount && (
                    <View style={styles.perkBox}>
                      <Ionicons name="gift-outline" size={14} color="#059669" />
                      <Text style={styles.perkText}>{vendor.specialSocietyDiscount}</Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.vendorActionRow}>
                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() => setSelectedVendorModal(vendor)}
                    >
                      <Ionicons name="information-circle-outline" size={15} color={COLORS.primary} />
                      <Text style={styles.detailsBtnText}>Stall Details</Text>
                    </TouchableOpacity>

                    {vendor.preOrderAvailable ? (
                      <TouchableOpacity
                        style={styles.preOrderBtn}
                        onPress={() =>
                          Alert.alert(
                            'Pre-Order with ' + vendor.name,
                            `Direct WhatsApp pre-orders open until Friday 9 PM.\n\nContact Vendor: ${vendor.contactNumber || 'Available at Gate'}`
                          )
                        }
                      >
                        <Ionicons name="bag-check-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.preOrderBtnText}>Pre-Order Slot</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.counterOnlyPill}>
                        <Text style={styles.counterOnlyText}>Walk-in Counter Only</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* ── Upcoming Future Market Schedule ──────────────────────── */}
            {marketDays.length > 1 && (
              <View style={styles.futureScheduleBox}>
                <Text style={styles.futureScheduleTitle}>Future Market Days Calendar</Text>
                {marketDays.slice(1).map((m) => (
                  <View key={m.id} style={styles.futureRow}>
                    <View style={styles.futureDateBox}>
                      <Ionicons name="calendar" size={16} color={COLORS.primary} />
                      <Text style={styles.futureDateText}>{m.date}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.futureTitle}>{m.title}</Text>
                      <Text style={styles.futureTime}>⏰ {m.time} · {m.location}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Vendor Detail Modal ────────────────────────────────────────── */}
      <Modal visible={!!selectedVendorModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedVendorModal?.name}</Text>
                <Text style={styles.modalSub}>{selectedVendorModal?.stallNumber} · {selectedVendorModal?.ownerName}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedVendorModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedVendorModal && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <Text style={styles.modalDesc}>{selectedVendorModal.description}</Text>

                <Text style={styles.modalSectionHead}>Specialties & Key Products</Text>
                <View style={styles.modalItemsList}>
                  {selectedVendorModal.popularItems.map((item, idx) => (
                    <View key={idx} style={styles.modalItemRow}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <Text style={styles.modalItemText}>{item}</Text>
                    </View>
                  ))}
                </View>

                {selectedVendorModal.specialSocietyDiscount && (
                  <View style={styles.modalDiscountBox}>
                    <Ionicons name="sparkles" size={16} color="#D97706" />
                    <Text style={styles.modalDiscountText}>
                      {selectedVendorModal.specialSocietyDiscount}
                    </Text>
                  </View>
                )}

                <View style={styles.contactMerchantBox}>
                  <Text style={styles.contactMerchantLabel}>Direct Contact</Text>
                  <Text style={styles.contactMerchantVal}>
                    📞 {selectedVendorModal.contactNumber || 'Society Estate Desk'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setSelectedVendorModal(null)}
                >
                  <Text style={styles.closeBtnText}>Done</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Stall Booking / Vendor Application Modal ──────────────────── */}
      <Modal visible={showStallBookingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Book a Market Stall</Text>
                <Text style={styles.modalSub}>For resident entrepreneurs & verified organic growers</Text>
              </View>
              <TouchableOpacity onPress={() => setShowStallBookingModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <Text style={styles.inputLabel}>Farm / Brand / Stall Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Grandma's Pickles & Bakes"
                placeholderTextColor={COLORS.textMuted}
                value={vendorName}
                onChangeText={setVendorName}
              />

              <Text style={styles.inputLabel}>Contact Phone Number *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="+91 98765 43210"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={vendorPhone}
                onChangeText={setVendorPhone}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.formCategoryRow}>
                {[
                  { label: '🥬 Farm Produce', val: 'ORGANIC_VEGGIES' },
                  { label: '🥖 Bakery', val: 'BAKERY' },
                  { label: '🥛 Dairy/Honey', val: 'FARM_DAIRY' },
                  { label: '🌱 Plants', val: 'PLANTS_NURSERY' },
                  { label: '🎨 Crafts', val: 'HANDMADE_CRAFTS' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.val}
                    style={[styles.formCatPill, vendorCategory === c.val && styles.formCatPillActive]}
                    onPress={() => setVendorCategory(c.val)}
                  >
                    <Text
                      style={[styles.formCatText, vendorCategory === c.val && styles.formCatTextActive]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Products Offered & FSSAI / Organic Certifications</Text>
              <TextInput
                style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="List main items you wish to sell, apartment/farm details..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                value={vendorProducts}
                onChangeText={setVendorProducts}
              />

              <TouchableOpacity
                style={styles.submitStallBtn}
                onPress={() => {
                  if (!vendorName.trim() || !vendorPhone.trim()) {
                    Alert.alert('Required Fields', 'Please enter your stall name and contact number.');
                    return;
                  }
                  stallMutation.mutate({
                    marketId: primaryMarket?.id || 'market-1',
                    vendorName,
                    category: vendorCategory,
                    phone: vendorPhone,
                    products: vendorProducts,
                  });
                }}
              >
                <Text style={styles.submitStallBtnText}>Submit Stall Application</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },

  // ── Hero ──────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#064E3B',
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  statusPillText: { fontSize: 11, fontWeight: '900', color: '#D1FAE5', letterSpacing: 0.5 },
  rsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  rsvpBtnActive: {
    backgroundColor: '#D1FAE5',
  },
  rsvpBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  rsvpBtnTextActive: { color: '#065F46' },
  heroTitle: { fontSize: 19, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  heroTheme: { fontSize: 13, color: '#A7F3D0', lineHeight: 18, marginBottom: 12 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 12,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: '#D1FAE5', fontWeight: '600' },
  highlightBox: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  highlightHead: { fontSize: 11, fontWeight: '800', color: '#FDE68A', marginBottom: 4, textTransform: 'uppercase' },
  highlightItem: { fontSize: 11, color: '#E6FFFA', lineHeight: 17 },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 10,
  },
  attendeePills: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  attendeeText: { fontSize: 12, fontWeight: '800', color: '#FDE68A' },
  bookStallMiniBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookStallMiniText: { fontSize: 12, fontWeight: '700', color: '#D1FAE5', textDecorationLine: 'underline' },

  // ── Sections & Filters ────────────────────────────────────────────
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  sectionSub: { fontSize: 12, color: COLORS.textMuted },
  catScroll: { flexDirection: 'row', gap: 6, paddingBottom: 14 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillSelected: {
    backgroundColor: '#065F46',
    borderColor: '#065F46',
  },
  catPillText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  catPillTextSelected: { color: '#FFFFFF' },

  // ── Vendor Cards ──────────────────────────────────────────────────
  vendorList: { gap: SPACING.md },
  vendorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stallPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  stallPillText: { fontSize: 10, fontWeight: '900', color: COLORS.primary },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  ratingText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  reviewCountText: { fontSize: 10, color: COLORS.textMuted },
  vendorName: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  vendorTagline: { fontSize: 12, fontWeight: '700', color: '#059669', marginBottom: 6 },
  vendorDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 10 },
  itemChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  itemChip: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  itemChipText: { fontSize: 11, color: COLORS.text, fontWeight: '600' },
  perkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  perkText: { fontSize: 11, fontWeight: '700', color: '#065F46', flex: 1 },
  vendorActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailsBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  preOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  preOrderBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  counterOnlyPill: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  counterOnlyText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },

  // ── Future Schedule ───────────────────────────────────────────────
  futureScheduleBox: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  futureScheduleTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  futureRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  futureDateBox: {
    backgroundColor: COLORS.primaryLight,
    padding: 8,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    minWidth: 90,
  },
  futureDateText: { fontSize: 10, fontWeight: '800', color: COLORS.primary, marginTop: 2, textAlign: 'center' },
  futureTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  futureTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // ── Modals ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  modalSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  modalDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 14 },
  modalSectionHead: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  modalItemsList: { gap: 6, marginBottom: 14 },
  modalItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalItemText: { fontSize: 12, color: COLORS.text },
  modalDiscountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 14,
  },
  modalDiscountText: { fontSize: 12, fontWeight: '800', color: '#92400E', flex: 1 },
  contactMerchantBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  contactMerchantLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted },
  contactMerchantVal: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  closeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  // ── Form Styles ───────────────────────────────────────────────────
  inputLabel: { fontSize: 12, fontWeight: '800', color: COLORS.text, marginTop: 10, marginBottom: 4 },
  textInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
  },
  formCategoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  formCatPill: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formCatPillActive: { backgroundColor: '#059669', borderColor: '#059669' },
  formCatText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  formCatTextActive: { color: '#FFFFFF' },
  submitStallBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  submitStallBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
