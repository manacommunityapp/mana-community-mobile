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
  DimensionValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { offersService } from '@/services/offersService';
import type { CommunityDemandPool } from '@/types/offers';

export default function DemandPoolsScreen() {
  const qc = useQueryClient();
  const [filterTab, setFilterTab] = useState<'ALL' | 'GATHERING' | 'LOCKED_IN' | 'FULFILLED'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Home & Appliances');
  const [targetProduct, setTargetProduct] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [targetCount, setTargetCount] = useState('25');
  const [description, setDescription] = useState('');

  const {
    data: demandPools = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['demandPools'],
    queryFn: offersService.getDemandPools,
  });

  const supportMutation = useMutation({
    mutationFn: (poolId: string) => offersService.supportDemandPool(poolId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demandPools'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CommunityDemandPool>) => offersService.createDemandPool(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demandPools'] });
      setShowCreateModal(false);
      setTitle('');
      setTargetProduct('');
      setRegularPrice('');
      setDiscountedPrice('');
      setDescription('');
      Alert.alert('Group Buy Launched!', 'Your community demand pool has been initiated. Neighbors can now pledge to unlock wholesale pricing.');
    },
  });

  const filteredPools = demandPools.filter((p) => {
    if (filterTab === 'ALL') return true;
    return p.status === filterTab;
  });

  // Calculate society potential savings
  const totalSavings = demandPools.reduce((acc, p) => {
    const diff = (p.regularPrice - p.discountedPrice) * p.currentSupporters;
    return acc + (diff > 0 ? diff : 0);
  }, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* ── Hero Banner ────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroPill}>
              <Ionicons name="people" size={13} color="#D1FAE5" />
              <Text style={styles.heroPillText}>Collective Bargaining Power</Text>
            </View>
            <View style={styles.savingsBox}>
              <Text style={styles.savingsVal}>₹{totalSavings.toLocaleString('en-IN')}</Text>
              <Text style={styles.savingsLabel}>Unlocked Savings</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Bulk Community Demand Pools</Text>
          <Text style={styles.heroDesc}>
            When enough neighbors pledge commitment, we bypass retailers and procure directly from manufacturers at wholesale prices.
          </Text>

          <TouchableOpacity
            style={styles.proposeBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={16} color="#FFFFFF" />
            <Text style={styles.proposeBtnText}>Propose New Group Buy</Text>
          </TouchableOpacity>
        </View>

        {/* ── Filter Tabs ────────────────────────────────────────────── */}
        <View style={styles.filterRow}>
          {[
            { key: 'ALL', label: 'All Pools' },
            { key: 'GATHERING', label: '⚡ Gathering' },
            { key: 'LOCKED_IN', label: '✅ Unlocked' },
            { key: 'FULFILLED', label: '📦 Fulfilled' },
          ].map((tab) => {
            const isSel = filterTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, isSel && styles.filterTabActive]}
                onPress={() => setFilterTab(tab.key as any)}
              >
                <Text style={[styles.filterTabText, isSel && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Pool Cards List ────────────────────────────────────────── */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : (
          <View style={styles.poolsList}>
            {filteredPools.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="people-circle-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Demand Pools</Text>
                <Text style={styles.emptySub}>No active group buying pools in this tab right now.</Text>
              </View>
            ) : (
              filteredPools.map((pool) => {
                const pct = Math.min((pool.currentSupporters / pool.targetCount) * 100, 100);
                const isLockedIn = pool.status === 'LOCKED_IN';
                const isFulfilled = pool.status === 'FULFILLED';
                const unitSavings = pool.regularPrice - pool.discountedPrice;

                return (
                  <View key={pool.id} style={styles.poolCard}>
                    {/* Top Row: Category & Status */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{pool.category}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isLockedIn && { backgroundColor: '#D1FAE5' },
                          isFulfilled && { backgroundColor: '#EDE9FE' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isLockedIn && { color: '#065F46' },
                            isFulfilled && { color: '#6D28D9' },
                          ]}
                        >
                          {isFulfilled
                            ? '📦 BATCH DELIVERED'
                            : isLockedIn
                            ? '✅ WHOLESALE UNLOCKED'
                            : '⚡ GATHERING NEIGHBORS'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.poolTitle}>{pool.title}</Text>
                    <Text style={styles.productName}>🎯 {pool.targetProduct}</Text>

                    {pool.brandOrVendor && (
                      <Text style={styles.vendorText}>🏢 Direct OEM / Collective: {pool.brandOrVendor}</Text>
                    )}

                    {pool.description && (
                      <Text style={styles.poolDesc}>{pool.description}</Text>
                    )}

                    {/* Price Comparison Matrix */}
                    <View style={styles.priceMatrix}>
                      <View style={styles.priceCol}>
                        <Text style={styles.priceLabel}>GROUP BUY PRICE</Text>
                        <Text style={styles.groupPriceVal}>₹{pool.discountedPrice.toLocaleString('en-IN')}</Text>
                      </View>
                      <View style={[styles.priceCol, { alignItems: 'center' }]}>
                        <Text style={styles.priceLabel}>REGULAR RETAIL</Text>
                        <Text style={styles.retailPriceVal}>₹{pool.regularPrice.toLocaleString('en-IN')}</Text>
                      </View>
                      <View style={[styles.priceCol, { alignItems: 'flex-end' }]}>
                        <Text style={styles.priceLabel}>YOU SAVE</Text>
                        <Text style={styles.savingsValText}>₹{unitSavings.toLocaleString('en-IN')}</Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>
                          {pool.currentSupporters} of {pool.targetCount} Neighbors Committed
                        </Text>
                        <Text style={styles.progressPct}>{Math.round(pct)}%</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${pct}%` as DimensionValue },
                            isLockedIn && { backgroundColor: '#059669' },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Perks / Delivery info */}
                    <View style={styles.footerInfoRow}>
                      <View style={styles.footerInfoItem}>
                        <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                        <Text style={styles.footerInfoText}>Pledge Deadline: {pool.deadline}</Text>
                      </View>
                      {pool.estimatedDelivery && (
                        <View style={styles.footerInfoItem}>
                          <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
                          <Text style={styles.footerInfoText}>Arrival: {pool.estimatedDelivery}</Text>
                        </View>
                      )}
                    </View>

                    {/* Initiator tag */}
                    {pool.initiatorName && (
                      <Text style={styles.initiatorText}>
                        Initiated by neighbor: <Text style={{ fontWeight: '800' }}>{pool.initiatorName}</Text> ({pool.initiatorFlat || 'Resident'})
                      </Text>
                    )}

                    {/* Pledge / Support Action */}
                    {!isFulfilled && (
                      <TouchableOpacity
                        style={[
                          styles.pledgeBtn,
                          pool.userSupported && styles.pledgeBtnActive,
                          supportMutation.isPending && { opacity: 0.7 },
                        ]}
                        onPress={() => supportMutation.mutate(pool.id)}
                        disabled={supportMutation.isPending}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={pool.userSupported ? 'checkmark-circle' : 'hand-right'}
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.pledgeBtnText}>
                          {pool.userSupported ? 'Pledged & Committed (Tap to cancel)' : 'Join Group Buy & Pledge Support'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Create Demand Pool Modal ─────────────────────────────────── */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Propose Bulk Demand Pool</Text>
                <Text style={styles.modalSub}>Rally neighbors to negotiate wholesale prices</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <Text style={styles.inputLabel}>Campaign / Product Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Solar Rooftop Inverter Bulk Order"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Home & Appliances, Groceries, EV..."
                placeholderTextColor={COLORS.textMuted}
                value={category}
                onChangeText={setCategory}
              />

              <Text style={styles.inputLabel}>Target Product / Specification *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Model, brand name, specific pack size..."
                placeholderTextColor={COLORS.textMuted}
                value={targetProduct}
                onChangeText={setTargetProduct}
              />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Market Price (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="1200"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={regularPrice}
                    onChangeText={setRegularPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Target Group Price (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="750"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={discountedPrice}
                    onChangeText={setDiscountedPrice}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Supporters Needed to Unlock</Text>
              <TextInput
                style={styles.textInput}
                placeholder="25"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={targetCount}
                onChangeText={setTargetCount}
              />

              <Text style={styles.inputLabel}>Description & Vendor Procurement Details</Text>
              <TextInput
                style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Explain why this bulk order benefits neighbors, distributor contact..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <TouchableOpacity
                style={styles.submitCreateBtn}
                onPress={() => {
                  if (!title.trim() || !targetProduct.trim()) {
                    Alert.alert('Required Fields', 'Please enter Campaign Title and Target Product.');
                    return;
                  }
                  createMutation.mutate({
                    title,
                    category,
                    targetProduct,
                    regularPrice: Number(regularPrice) || 1000,
                    discountedPrice: Number(discountedPrice) || 700,
                    targetCount: Number(targetCount) || 25,
                    description,
                  });
                }}
              >
                <Text style={styles.submitCreateBtnText}>Launch Group Demand Campaign</Text>
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
    backgroundColor: '#047857',
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  heroPillText: { fontSize: 10, fontWeight: '800', color: '#D1FAE5' },
  savingsBox: { alignItems: 'flex-end' },
  savingsVal: { fontSize: 16, fontWeight: '900', color: '#FDE68A' },
  savingsLabel: { fontSize: 9, color: '#A7F3D0' },
  heroTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  heroDesc: { fontSize: 12, color: '#D1FAE5', lineHeight: 17, marginBottom: 12 },
  proposeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  proposeBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  // ── Filter Tabs ───────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  filterTabText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  filterTabTextActive: { color: COLORS.primary, fontWeight: '800' },

  // ── Pools List ────────────────────────────────────────────────────
  poolsList: { gap: SPACING.md },
  poolCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  catBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  poolTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 3 },
  productName: { fontSize: 12, fontWeight: '700', color: '#047857', marginBottom: 4 },
  vendorText: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8 },
  poolDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 12 },

  // Price Matrix
  priceMatrix: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  priceCol: { flex: 1 },
  priceLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, marginBottom: 2 },
  groupPriceVal: { fontSize: 15, fontWeight: '900', color: '#059669' },
  retailPriceVal: { fontSize: 13, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  savingsValText: { fontSize: 14, fontWeight: '900', color: '#D97706' },

  // Progress Bar
  progressContainer: { marginBottom: 10 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  progressPct: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },

  footerInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 6 },
  footerInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerInfoText: { fontSize: 11, color: COLORS.textMuted },
  initiatorText: { fontSize: 11, color: COLORS.textMuted, marginBottom: 12 },

  pledgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  pledgeBtnActive: { backgroundColor: '#065F46' },
  pledgeBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  // ── Empty State ───────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  // ── Create Modal ──────────────────────────────────────────────────
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
  twoColRow: { flexDirection: 'row', gap: 10 },
  submitCreateBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  submitCreateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
