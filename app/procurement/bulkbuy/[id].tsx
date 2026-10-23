import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { BulkBuyCommitment, BulkBuyPriceTier } from '@/types/procurement';

const CATEGORY_EMOJI: Record<string, string> = {
  CLEANING_SUPPLIES: '🧹', ELECTRICAL: '⚡', PLUMBING: '🔧',
  OFFICE_SUPPLIES: '📎', GARDENING: '🌿', SECURITY_EQUIPMENT: '🔒',
  FURNITURE: '🪑', IT_EQUIPMENT: '💻', FOOD_BEVERAGE: '🍱',
  MAINTENANCE: '🏢', PACKAGING: '📦', OTHER: '📦',
};

function daysLeft(d: string) {
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
}

function resolvePrice(tiers: BulkBuyPriceTier[], qty: number): number | null {
  if (!tiers.length) return null;
  const sorted = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
  return sorted.find(t => qty >= t.minQuantity)?.pricePerUnit
    ?? sorted[sorted.length - 1].pricePerUnit;
}

function nextTierInfo(tiers: BulkBuyPriceTier[], currentQty: number) {
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  const next = sorted.find(t => t.minQuantity > currentQty);
  return next ? { qty: next.minQuantity, price: next.pricePerUnit, need: next.minQuantity - currentQty } : null;
}

export default function BulkBuyCampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [commitQty, setCommitQty] = useState('');
  const [tab, setTab] = useState<'overview' | 'commitments'>('overview');

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['bulkbuy-campaign', id],
    queryFn: () => procurementHubService.getBulkBuyCampaign(Number(id)),
    enabled: !!id,
  });

  const { data: commitments = [] } = useQuery({
    queryKey: ['bulkbuy-commitments', id],
    queryFn: () => procurementHubService.getCampaignCommitments(Number(id)),
    enabled: !!id && tab === 'commitments',
  });

  const commitMut = useMutation({
    mutationFn: (qty: number) =>
      procurementHubService.commitToCampaign(Number(id), { quantity: qty }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulkbuy-campaign', id] });
      qc.invalidateQueries({ queryKey: ['bulkbuy-campaigns'] });
      setCommitQty('');
      Alert.alert('Committed! 🎉', 'Your commitment has been recorded. You\'ll be notified when the campaign confirms.');
    },
    onError: () => Alert.alert('Error', 'Failed to commit. Please try again.'),
  });

  const cancelMut = useMutation({
    mutationFn: () => procurementHubService.cancelCampaignCommitment(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulkbuy-campaign', id] });
      qc.invalidateQueries({ queryKey: ['bulkbuy-campaigns'] });
    },
    onError: () => Alert.alert('Error', 'Failed to cancel. Please try again.'),
  });

  const activateMut = useMutation({
    mutationFn: () => procurementHubService.activateBulkBuyCampaign(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulkbuy-campaign', id] });
      qc.invalidateQueries({ queryKey: ['bulkbuy-campaigns'] });
    },
  });

  if (isLoading || !campaign) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  const progress = campaign.minOrderQuantity > 0
    ? Math.min(1, campaign.currentQuantity / campaign.minOrderQuantity)
    : 0;
  const pct = Math.round(progress * 100);
  const days = daysLeft(campaign.deadlineDate);
  const tiers = campaign.priceTiers ?? [];
  const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  const next = nextTierInfo(tiers, campaign.currentQuantity);
  const isJoined = campaign.myCommitmentQuantity != null && campaign.myCommitmentQuantity > 0;

  const qtyNum = parseInt(commitQty, 10) || 0;
  const projectedTotal = campaign.currentQuantity + qtyNum;
  const projectedPrice = qtyNum > 0 ? resolvePrice(tiers, projectedTotal) : null;
  const projectedSavings = campaign.retailPrice && projectedPrice
    ? Math.round((campaign.retailPrice - projectedPrice) * qtyNum)
    : null;

  function handleCommit() {
    const qty = parseInt(commitQty, 10);
    if (!qty || qty < 1) {
      Alert.alert('Enter quantity', 'Please enter a valid quantity to commit.');
      return;
    }
    const price = resolvePrice(tiers, projectedTotal);
    const total = price != null ? price * qty : 0;
    Alert.alert(
      'Confirm Commitment',
      `Commit ${qty} ${campaign.unit} at ₹${price ?? 'TBD'}/${campaign.unit}?\nEstimated: ₹${Math.round(total)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => commitMut.mutate(qty) },
      ],
    );
  }

  function handleCancel() {
    Alert.alert(
      'Cancel Commitment',
      `Remove your commitment of ${campaign.myCommitmentQuantity} ${campaign.unit}?`,
      [
        { text: 'Keep It', style: 'cancel' },
        { text: 'Cancel Commitment', style: 'destructive', onPress: () => cancelMut.mutate() },
      ],
    );
  }

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <LinearGradient
        colors={progress >= 1 ? ['#065F46', '#059669', '#10B981'] : ['#0F2744', '#1E3A5F', '#2563EB']}
        style={s.hero}
      >
        <View style={s.heroBadgeRow}>
          <View style={s.categoryChip}>
            <Text style={{ fontSize: 16 }}>{CATEGORY_EMOJI[campaign.category] ?? '📦'}</Text>
          </View>
          <View style={[s.statusBadge,
            campaign.status === 'COMMITTED' ? s.statusCommitted :
            campaign.status === 'AWARDED'   ? s.statusAwarded   :
            campaign.status === 'CANCELLED' ? s.statusCancelled : s.statusActive,
          ]}>
            <Text style={s.statusText}>{campaign.status}</Text>
          </View>
        </View>
        <Text style={s.heroTitle}>{campaign.title}</Text>
        <Text style={s.heroProduct}>{campaign.productName} · per {campaign.unit}</Text>
        {campaign.description && (
          <Text style={s.heroDesc}>{campaign.description}</Text>
        )}
        <View style={s.heroMeta}>
          <Text style={s.heroMetaText}>👥 {campaign.commitmentCount} committed</Text>
          <Text style={[s.heroMetaText, days <= 2 && { color: '#FCA5A5' }]}>
            ⏰ {days === 0 ? 'Ends today' : `${days} days left`}
          </Text>
          {campaign.deliveryDate && (
            <Text style={s.heroMetaText}>🚚 Delivery: {campaign.deliveryDate}</Text>
          )}
        </View>
      </LinearGradient>

      {/* Progress Section */}
      <View style={s.progressCard}>
        <View style={s.progressHeader}>
          <Text style={s.progressTitle}>Campaign Progress</Text>
          <Text style={s.progressPct}>{pct}% funded</Text>
        </View>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${pct}%` as any,
            backgroundColor: progress >= 1 ? '#059669' : '#2563EB' }]} />
        </View>
        <View style={s.progressStats}>
          <Text style={s.progressStat}>
            <Text style={{ fontWeight: '800', color: '#1E293B' }}>{campaign.currentQuantity}</Text>
            {' / '}{campaign.minOrderQuantity} {campaign.unit}
          </Text>
          {campaign.targetQuantity && (
            <Text style={s.progressStat}>
              Target: {campaign.targetQuantity} {campaign.unit}
            </Text>
          )}
        </View>
        {progress < 1 && campaign.status === 'ACTIVE' && (
          <View style={s.thresholdHint}>
            <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
            <Text style={s.thresholdText}>
              {campaign.minOrderQuantity - campaign.currentQuantity} more {campaign.unit} needed to confirm this campaign
            </Text>
          </View>
        )}
        {progress >= 1 && (
          <View style={s.confirmedBanner}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={s.confirmedText}>Minimum threshold reached! Campaign confirmed.</Text>
          </View>
        )}
        {next && (
          <View style={s.nextTierHint}>
            <Ionicons name="trending-up-outline" size={13} color="#7C3AED" />
            <Text style={s.nextTierText}>
              {next.need} more → unlock ₹{next.price}/{campaign.unit}
            </Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['overview', 'commitments'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'overview' ? 'Overview' : `Members (${campaign.commitmentCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'overview' ? (
        <>
          {/* Price Tiers */}
          {sortedTiers.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Price Tiers</Text>
              <View style={s.tiersCard}>
                {sortedTiers.map((tier, i) => {
                  const unlocked = campaign.currentQuantity >= tier.minQuantity;
                  const isCurrent = unlocked &&
                    (i === sortedTiers.length - 1 ||
                     campaign.currentQuantity < sortedTiers[i + 1].minQuantity);
                  const savings = campaign.retailPrice
                    ? Math.round(((campaign.retailPrice - tier.pricePerUnit) / campaign.retailPrice) * 100)
                    : null;

                  return (
                    <View key={i} style={[s.tierRow, i > 0 && s.tierBorder]}>
                      <View style={[s.tierDot,
                        unlocked ? s.tierDotUnlocked : s.tierDotLocked,
                        isCurrent && s.tierDotCurrent,
                      ]}>
                        {unlocked && <Ionicons name="checkmark" size={10} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.tierQty}>{tier.minQuantity}+ {campaign.unit}</Text>
                        {isCurrent && (
                          <Text style={s.tierCurrentLabel}>← CURRENT</Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.tierPrice, unlocked && s.tierPriceUnlocked]}>
                          ₹{tier.pricePerUnit}/{campaign.unit}
                        </Text>
                        {savings != null && savings > 0 && (
                          <Text style={s.tierSavings}>{savings}% off MRP</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              {campaign.retailPrice && (
                <Text style={s.retailNote}>MRP: ₹{campaign.retailPrice}/{campaign.unit}</Text>
              )}
            </View>
          )}

          {/* Commit Section */}
          {campaign.status === 'ACTIVE' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {isJoined ? 'Your Commitment' : 'Join This Campaign'}
              </Text>
              {isJoined ? (
                <View style={s.joinedCard}>
                  <View style={s.joinedRow}>
                    <Ionicons name="checkmark-circle" size={22} color="#059669" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.joinedTitle}>You're in!</Text>
                      <Text style={s.joinedDesc}>
                        {campaign.myCommitmentQuantity} {campaign.unit}
                        {campaign.currentEffectivePrice != null &&
                          ` at ₹${campaign.currentEffectivePrice}/${campaign.unit}`}
                      </Text>
                    </View>
                  </View>
                  <View style={s.joinedActions}>
                    <TouchableOpacity
                      style={s.updateBtn}
                      onPress={() => {
                        setCommitQty(String(campaign.myCommitmentQuantity ?? ''));
                        Alert.alert(
                          'Update Commitment',
                          'Enter new quantity below and tap Commit.',
                        );
                      }}
                    >
                      <Text style={s.updateBtnText}>Update Quantity</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
                      <Text style={s.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <View style={s.commitCard}>
                <Text style={s.commitLabel}>Quantity ({campaign.unit})</Text>
                <View style={s.qtyRow}>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => setCommitQty(v => String(Math.max(1, (parseInt(v) || 0) - 1)))}
                  >
                    <Ionicons name="remove" size={18} color="#1E293B" />
                  </TouchableOpacity>
                  <TextInput
                    style={s.qtyInput}
                    keyboardType="number-pad"
                    value={commitQty}
                    onChangeText={setCommitQty}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => setCommitQty(v => String((parseInt(v) || 0) + 1))}
                  >
                    <Ionicons name="add" size={18} color="#1E293B" />
                  </TouchableOpacity>
                </View>

                {/* Projected price preview */}
                {qtyNum > 0 && (
                  <View style={s.preview}>
                    <View style={s.previewRow}>
                      <Text style={s.previewLabel}>Price per unit</Text>
                      <Text style={s.previewVal}>
                        ₹{projectedPrice ?? 'TBD'}/{campaign.unit}
                      </Text>
                    </View>
                    <View style={s.previewRow}>
                      <Text style={s.previewLabel}>Estimated total</Text>
                      <Text style={s.previewTotal}>
                        ₹{projectedPrice != null ? Math.round(projectedPrice * qtyNum) : '—'}
                      </Text>
                    </View>
                    {projectedSavings != null && projectedSavings > 0 && (
                      <View style={s.previewSavings}>
                        <Ionicons name="trending-down" size={13} color="#059669" />
                        <Text style={s.previewSavingsText}>
                          Save ₹{projectedSavings} vs MRP
                        </Text>
                      </View>
                    )}
                    {projectedTotal > campaign.currentQuantity &&
                      projectedTotal >= campaign.minOrderQuantity && !isJoined && (
                      <View style={s.previewConfirm}>
                        <Ionicons name="checkmark-circle" size={13} color="#059669" />
                        <Text style={s.previewConfirmText}>
                          Your commitment will confirm this campaign!
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[s.commitBtn, commitMut.isPending && { opacity: 0.6 }]}
                  onPress={handleCommit}
                  disabled={commitMut.isPending}
                >
                  {commitMut.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Ionicons name="cart" size={16} color="#fff" />
                        <Text style={s.commitBtnText}>
                          {isJoined ? 'Update Commitment' : 'Commit to Buy'}
                        </Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {campaign.status === 'DRAFT' && (
            <View style={s.section}>
              <View style={s.draftCard}>
                <Ionicons name="information-circle-outline" size={18} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={s.draftTitle}>Campaign is in Draft</Text>
                  <Text style={s.draftDesc}>Activate to allow members to commit.</Text>
                </View>
                <TouchableOpacity
                  style={s.activateBtn}
                  onPress={() => activateMut.mutate()}
                  disabled={activateMut.isPending}
                >
                  <Text style={s.activateBtnText}>Activate</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* How BulkBuy works */}
          <View style={s.section}>
            <View style={s.howCard}>
              <Text style={s.howTitle}>💡 How BulkBuy works</Text>
              {[
                'Members commit to a quantity they want to buy',
                'As total commitments grow, better price tiers unlock',
                'Once the minimum quantity is reached, the campaign confirms',
                'The association places a bulk order at the unlocked price',
                'Everyone pays the same negotiated price per unit',
              ].map((step, i) => (
                <View key={i} style={s.howRow}>
                  <Text style={s.howStep}>{i + 1}</Text>
                  <Text style={s.howText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : (
        /* Commitments tab */
        <View style={s.section}>
          {commitments.length === 0 ? (
            <View style={s.emptyCommit}>
              <Text style={{ fontSize: 32 }}>👥</Text>
              <Text style={s.emptyCommitText}>No commitments yet</Text>
            </View>
          ) : (
            <View style={s.commitmentsCard}>
              {commitments.filter(c => c.status !== 'CANCELLED').map((c, i) => (
                <CommitmentRow key={c.id} commitment={c} unit={campaign.unit} border={i > 0} />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function CommitmentRow({
  commitment: c, unit, border,
}: {
  commitment: BulkBuyCommitment; unit: string; border: boolean;
}) {
  return (
    <View style={[s.commitRow, border && s.commitBorder]}>
      <View style={s.commitAvatar}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
          {c.userName?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.commitName}>{c.userName || 'Member'}</Text>
        <Text style={s.commitDate}>{c.createdAt.slice(0, 10)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.commitQty}>{c.quantity} {unit}</Text>
        {c.pricePerUnit != null && (
          <Text style={s.commitPrice}>₹{c.pricePerUnit}/{unit}</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },

  hero: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, gap: 6 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  categoryChip: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusActive:    { backgroundColor: 'rgba(34,197,94,0.25)' },
  statusCommitted: { backgroundColor: 'rgba(59,130,246,0.25)' },
  statusAwarded:   { backgroundColor: 'rgba(168,85,247,0.25)' },
  statusCancelled: { backgroundColor: 'rgba(239,68,68,0.25)' },
  statusText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroProduct: { fontSize: 13, color: '#BAE6FD' },
  heroDesc: { fontSize: 12, color: '#93C5FD', marginTop: 2, lineHeight: 18 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  heroMetaText: { fontSize: 12, color: '#BAE6FD' },

  progressCard: {
    backgroundColor: '#fff', margin: 12, borderRadius: RADIUS.lg,
    padding: 14, gap: 8, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  progressPct: { fontSize: 14, fontWeight: '800', color: '#2563EB' },
  progressBar: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressStats: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStat: { fontSize: 12, color: COLORS.textMuted },
  thresholdHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8,
  },
  thresholdText: { flex: 1, fontSize: 12, color: '#92400E' },
  confirmedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8,
  },
  confirmedText: { flex: 1, fontSize: 12, color: '#166534', fontWeight: '600' },
  nextTierHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FAF5FF', borderRadius: 8, padding: 8,
  },
  nextTierText: { flex: 1, fontSize: 12, color: '#7C3AED', fontWeight: '600' },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 12, marginBottom: 4,
    backgroundColor: '#E2E8F0', borderRadius: RADIUS.lg, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 7, borderRadius: RADIUS.md, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', ...SHADOWS.sm },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#1E293B', fontWeight: '700' },

  section: { paddingHorizontal: 12, marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 8 },

  tiersCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  tierBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  tierDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  tierDotLocked:    { backgroundColor: '#E2E8F0' },
  tierDotUnlocked:  { backgroundColor: '#059669' },
  tierDotCurrent:   { backgroundColor: '#2563EB' },
  tierQty: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  tierCurrentLabel: { fontSize: 10, color: '#2563EB', fontWeight: '700', marginTop: 1 },
  tierPrice: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  tierPriceUnlocked: { color: '#059669' },
  tierSavings: { fontSize: 10, color: '#059669', marginTop: 1 },
  retailNote: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, textAlign: 'right' },

  joinedCard: {
    backgroundColor: '#F0FDF4', borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 8, gap: 8,
  },
  joinedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  joinedTitle: { fontSize: 14, fontWeight: '700', color: '#166534' },
  joinedDesc: { fontSize: 12, color: '#166534', marginTop: 2 },
  joinedActions: { flexDirection: 'row', gap: 8 },
  updateBtn: {
    flex: 1, backgroundColor: '#DCFCE7', borderRadius: RADIUS.md, paddingVertical: 7,
    alignItems: 'center',
  },
  updateBtnText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  cancelBtn: {
    backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 7,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#991B1B' },

  commitCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm, gap: 10,
  },
  commitLabel: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  qtyInput: {
    flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    padding: 8, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#1E293B',
  },
  preview: {
    backgroundColor: '#F0F9FF', borderRadius: 10, padding: 10, gap: 6,
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { fontSize: 12, color: COLORS.textMuted },
  previewVal: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  previewTotal: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  previewSavings: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  previewSavingsText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  previewConfirm: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  previewConfirmText: { fontSize: 12, fontWeight: '600', color: '#059669' },
  commitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2563EB', borderRadius: RADIUS.lg, paddingVertical: 12,
  },
  commitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  draftCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  draftTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  draftDesc: { fontSize: 11, color: '#78350F', marginTop: 2 },
  activateBtn: { backgroundColor: '#D97706', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  activateBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  howCard: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 8,
  },
  howTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  howStep: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#2563EB',
    textAlign: 'center', lineHeight: 20, color: '#fff', fontWeight: '700', fontSize: 11,
    overflow: 'hidden',
  },
  howText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 },

  emptyCommit: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyCommitText: { fontSize: 14, color: COLORS.textMuted },

  commitmentsCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  commitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  commitBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  commitAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  commitName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  commitDate: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  commitQty: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  commitPrice: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
});
