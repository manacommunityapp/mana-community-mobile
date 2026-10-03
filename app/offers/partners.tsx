import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { offersService } from '@/services/offersService';
import type { BusinessPartner } from '@/types/offers';

export default function PartnersDirectoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPartnerModal, setSelectedPartnerModal] = useState<BusinessPartner | null>(null);
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [nominateName, setNominateName] = useState('');
  const [nominatePhone, setNominatePhone] = useState('');
  const [nominateCategory, setNominateCategory] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['offerCategories'],
    queryFn: offersService.getCategories,
  });

  const {
    data: businesses = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['businessPartners', selectedCategory, searchQuery],
    queryFn: () => offersService.getBusinesses(selectedCategory, searchQuery),
  });

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('Contact Merchant', 'Phone number not available');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert('Calling Partner', `Direct line: ${phone}`);
    });
  };

  const handleWhatsApp = (whatsapp?: string, name?: string) => {
    if (!whatsapp) {
      Alert.alert('WhatsApp Inquiry', 'WhatsApp line not available');
      return;
    }
    const cleanPhone = whatsapp.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hi ${name || 'Partner'}, I am a resident of Mana Community inquiring about your society offers.`);
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${msg}`).catch(() => {
      Alert.alert('WhatsApp Message', `Opening WhatsApp for ${cleanPhone}...`);
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM_PARTNER':
        return { bg: '#EDE9FE', text: '#6D28D9', label: '👑 Platinum Partner' };
      case 'GOLD_PARTNER':
        return { bg: '#FEF3C7', text: '#B45309', label: '⭐ Gold Partner' };
      case 'SILVER_PARTNER':
        return { bg: '#F1F5F9', text: '#475569', label: '🥈 Silver Partner' };
      default:
        return { bg: '#ECFDF5', text: '#059669', label: '✅ Verified Local' };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* ── Directory Header Banner ─────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroPill}>
              <Ionicons name="shield-checkmark" size={13} color="#D1FAE5" />
              <Text style={styles.heroPillText}>RWA Vetted & Neighborhood Rate Lock</Text>
            </View>
            <TouchableOpacity
              style={styles.nominateBtn}
              onPress={() => setShowNominateModal(true)}
            >
              <Ionicons name="add-circle" size={13} color="#FDE68A" />
              <Text style={styles.nominateBtnText}>Nominate Shop</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTitle}>Local Verified Merchant Directory</Text>
          <Text style={styles.heroDesc}>
            Trusted neighborhood clinics, salons, auto garages & fresh food suppliers offering special discounts to our society.
          </Text>
        </View>

        {/* ── Search Bar ──────────────────────────────────────────────── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchants, clinics, bakers, car detailing..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Category Filter Pills ───────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map((c) => {
            const isSel = selectedCategory === c.code;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.catPill, isSel && styles.catPillSelected]}
                onPress={() => setSelectedCategory(c.code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catPillText, isSel && styles.catPillTextSelected]}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Partners List ───────────────────────────────────────────── */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : (
          <View style={styles.partnersList}>
            {businesses.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="storefront-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Merchants Found</Text>
                <Text style={styles.emptySub}>Try searching another keyword or choose another category filter.</Text>
              </View>
            ) : (
              businesses.map((biz) => {
                const tierInfo = getTierColor(biz.partnershipTier);
                return (
                  <View key={biz.id} style={styles.partnerCard}>
                    {/* Top Row */}
                    <View style={styles.partnerHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.partnerName}>{biz.name}</Text>
                          {biz.isVerified && (
                            <Ionicons name="checkmark-circle" size={17} color="#059669" />
                          )}
                        </View>
                        <Text style={styles.partnerCat}>
                          {biz.categoryName} · 📍 {biz.distanceKm} km from Society Gate
                        </Text>
                      </View>
                      <View style={[styles.tierPill, { backgroundColor: tierInfo.bg }]}>
                        <Text style={[styles.tierText, { color: tierInfo.text }]}>{tierInfo.label}</Text>
                      </View>
                    </View>

                    {biz.tagline && <Text style={styles.partnerTagline}>✨ {biz.tagline}</Text>}
                    <Text style={styles.partnerDesc}>{biz.description}</Text>

                    {/* Society Exclusive Discount Ribbon */}
                    {biz.societyDiscount && (
                      <View style={styles.discountRibbon}>
                        <Ionicons name="pricetag" size={14} color="#065F46" />
                        <Text style={styles.discountRibbonText}>{biz.societyDiscount}</Text>
                      </View>
                    )}

                    {/* Exclusive Perks */}
                    {biz.exclusivePerks && biz.exclusivePerks.length > 0 && (
                      <View style={styles.perksBox}>
                        <Text style={styles.perksHead}>Resident Member Perks:</Text>
                        {biz.exclusivePerks.map((p, idx) => (
                          <View key={idx} style={styles.perkItemRow}>
                            <Ionicons name="checkmark-circle" size={13} color="#059669" />
                            <Text style={styles.perkItemText}>{p}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Metadata: Hours & Address */}
                    <View style={styles.metaBox}>
                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                        <Text style={styles.metaVal}>{biz.openingHours || '10:00 AM – 8:00 PM'}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Ionicons name="navigate-outline" size={13} color={COLORS.textMuted} />
                        <Text style={styles.metaVal} numberOfLines={1}>{biz.address}</Text>
                      </View>
                    </View>

                    {/* Bottom Action Row */}
                    <View style={styles.cardActionRow}>
                      <View style={styles.ratingBox}>
                        <Ionicons name="star" size={13} color="#D97706" />
                        <Text style={styles.ratingVal}>{biz.averageRating}</Text>
                        <Text style={styles.ratingReviews}>({biz.reviewCount} reviews)</Text>
                      </View>

                      <View style={styles.btnGroup}>
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => handleCall(biz.phone)}
                        >
                          <Ionicons name="call" size={14} color={COLORS.primary} />
                          <Text style={styles.callBtnText}>Call</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.whatsappBtn}
                          onPress={() => handleWhatsApp(biz.whatsapp, biz.name)}
                        >
                          <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
                          <Text style={styles.whatsappBtnText}>WhatsApp</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Nominate Business Modal ───────────────────────────────────── */}
      <Modal visible={showNominateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nominate a Neighborhood Shop</Text>
                <Text style={styles.modalSub}>Help RWA negotiate exclusive society discounts</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNominateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Merchant / Business Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Green Tree Dry Cleaners, Sarjapur"
                placeholderTextColor={COLORS.textMuted}
                value={nominateName}
                onChangeText={setNominateName}
              />

              <Text style={styles.inputLabel}>Business Phone / Contact</Text>
              <TextInput
                style={styles.textInput}
                placeholder="+91 98450 XXXXX"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={nominatePhone}
                onChangeText={setNominatePhone}
              />

              <Text style={styles.inputLabel}>Service Category & Why they are great</Text>
              <TextInput
                style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Laundry, car repair, bakery, pediatrician..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                value={nominateCategory}
                onChangeText={setNominateCategory}
              />

              <TouchableOpacity
                style={styles.submitNominateBtn}
                onPress={() => {
                  if (!nominateName.trim()) {
                    Alert.alert('Required', 'Please enter business name.');
                    return;
                  }
                  setShowNominateModal(false);
                  setNominateName('');
                  setNominatePhone('');
                  setNominateCategory('');
                  Alert.alert('Nomination Received!', 'The Commerce Committee will reach out to this merchant to set up resident exclusive pricing.');
                }}
              >
                <Text style={styles.submitNominateBtnText}>Submit Nomination</Text>
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
    backgroundColor: '#1E1B4B',
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  heroPillText: { fontSize: 10, fontWeight: '800', color: '#D1FAE5' },
  nominateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nominateBtnText: { fontSize: 11, fontWeight: '800', color: '#FDE68A' },
  heroTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  heroDesc: { fontSize: 12, color: '#C7D2FE', lineHeight: 17 },

  // ── Search & Filter ───────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text },
  catScroll: { flexDirection: 'row', gap: 6, paddingBottom: 14 },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catPillText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  catPillTextSelected: { color: '#FFFFFF' },

  // ── Partners List ─────────────────────────────────────────────────
  partnersList: { gap: SPACING.md },
  partnerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  partnerName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  partnerCat: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  tierText: { fontSize: 10, fontWeight: '800' },
  partnerTagline: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  partnerDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 10 },
  discountRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    padding: 8,
    borderRadius: RADIUS.md,
    marginBottom: 10,
  },
  discountRibbonText: { fontSize: 11, fontWeight: '800', color: '#065F46', flex: 1 },
  perksBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 10,
  },
  perksHead: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, marginBottom: 4 },
  perkItemRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  perkItemText: { fontSize: 11, color: COLORS.text, fontWeight: '600' },
  metaBox: { gap: 4, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaVal: { fontSize: 11, color: COLORS.textMuted, flex: 1 },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingVal: { fontSize: 12, fontWeight: '800', color: '#B45309' },
  ratingReviews: { fontSize: 10, color: COLORS.textMuted },
  btnGroup: { flexDirection: 'row', gap: 8 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  callBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  whatsappBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

  // ── Empty State ───────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  // ── Nominate Modal ────────────────────────────────────────────────
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  modalSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
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
  submitNominateBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  submitNominateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
