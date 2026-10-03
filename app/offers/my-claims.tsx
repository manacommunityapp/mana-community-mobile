import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { offersService } from '@/services/offersService';
import type { UserOfferClaim } from '@/types/offers';

export default function MyClaimsScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'REDEEMED' | 'EXPIRED'>('ACTIVE');
  const [activeQrModal, setActiveQrModal] = useState<UserOfferClaim | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const {
    data: claims = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['myClaims'],
    queryFn: offersService.getMyClaims,
  });

  const redeemMutation = useMutation({
    mutationFn: (claimId: string) => offersService.redeemVoucher(claimId),
    onSuccess: (updatedClaim) => {
      qc.invalidateQueries({ queryKey: ['myClaims'] });
      setActiveQrModal(null);
      Alert.alert('Voucher Redeemed!', 'Your discount has been verified and applied by the partner merchant.');
    },
  });

  const handleCopy = (code: string) => {
    Clipboard.setString(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const filteredClaims = claims.filter((c) => {
    if (activeTab === 'ACTIVE') return c.status === 'ACTIVE';
    if (activeTab === 'REDEEMED') return c.status === 'REDEEMED';
    return c.status === 'EXPIRED';
  });

  // Calculate wallet savings
  const totalSavingsClaimed = claims.reduce((acc, c) => acc + (c.savingsAmount || 150), 0);
  const activeCount = claims.filter((c) => c.status === 'ACTIVE').length;
  const redeemedCount = claims.filter((c) => c.status === 'REDEEMED').length;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* ── Wallet Overview Card ────────────────────────────────────── */}
        <View style={styles.walletHero}>
          <View style={styles.walletTopRow}>
            <View style={styles.walletPill}>
              <Ionicons name="wallet-outline" size={13} color="#D1FAE5" />
              <Text style={styles.walletPillText}>Mana Resident Passbook</Text>
            </View>
            <View style={styles.savingsBox}>
              <Text style={styles.savingsVal}>₹{totalSavingsClaimed.toLocaleString('en-IN')}</Text>
              <Text style={styles.savingsLabel}>Total Savings Claimed</Text>
            </View>
          </View>

          <Text style={styles.walletTitle}>Your Voucher Wallet & Pass</Text>
          <Text style={styles.walletDesc}>
            Present dynamic QR codes or voucher promo codes at neighborhood store checkouts to redeem resident-only prices.
          </Text>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricNum}>{activeCount}</Text>
              <Text style={styles.metricLabel}>Active Vouchers</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricNum}>{redeemedCount}</Text>
              <Text style={styles.metricLabel}>Redeemed</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricNum}>{claims.length}</Text>
              <Text style={styles.metricLabel}>Total Claimed</Text>
            </View>
          </View>
        </View>

        {/* ── Segmented Tab Switch ────────────────────────────────────── */}
        <View style={styles.tabBar}>
          {[
            { key: 'ACTIVE', label: `Active (${activeCount})` },
            { key: 'REDEEMED', label: `Redeemed (${redeemedCount})` },
            { key: 'EXPIRED', label: 'Expired' },
          ].map((t) => {
            const isSel = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, isSel && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key as any)}
              >
                <Text style={[styles.tabBtnText, isSel && styles.tabBtnTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Claims List ─────────────────────────────────────────────── */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : (
          <View style={styles.claimsList}>
            {filteredClaims.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="ticket-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>
                  {activeTab === 'ACTIVE'
                    ? 'No Active Vouchers'
                    : activeTab === 'REDEEMED'
                    ? 'No Redeemed Vouchers'
                    : 'No Expired Vouchers'}
                </Text>
                <Text style={styles.emptySub}>
                  {activeTab === 'ACTIVE'
                    ? 'Explore deals hub and claim discounts to add them to your wallet pass.'
                    : 'Your past voucher history will appear here once redeemed.'}
                </Text>
              </View>
            ) : (
              filteredClaims.map((claim) => {
                const isActive = claim.status === 'ACTIVE';
                const isRedeemed = claim.status === 'REDEEMED';

                return (
                  <View
                    key={claim.id}
                    style={[
                      styles.voucherCard,
                      isRedeemed && { opacity: 0.85, borderColor: COLORS.border },
                    ]}
                  >
                    {/* Top row */}
                    <View style={styles.voucherTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bizName}>{claim.businessName}</Text>
                        <Text style={styles.voucherTitle}>{claim.offerTitle}</Text>
                        <Text style={styles.discountText}>{claim.discountSummary}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isActive && { backgroundColor: '#D1FAE5' },
                          isRedeemed && { backgroundColor: '#E2E8F0' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isActive && { color: '#065F46' },
                            isRedeemed && { color: '#475569' },
                          ]}
                        >
                          {isActive ? '● READY TO USE' : isRedeemed ? '✓ REDEEMED' : 'EXPIRED'}
                        </Text>
                      </View>
                    </View>

                    {/* Voucher Code Box */}
                    <View style={styles.codeContainer}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.codeLabel}>PROMO CODE</Text>
                        <Text style={styles.codeVal}>{claim.voucherCode}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => handleCopy(claim.voucherCode)}
                      >
                        <Ionicons
                          name={copiedCode === claim.voucherCode ? 'checkmark' : 'copy-outline'}
                          size={14}
                          color={COLORS.primary}
                        />
                        <Text style={styles.copyBtnText}>
                          {copiedCode === claim.voucherCode ? 'Copied' : 'Copy'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Voucher Actions & Validity */}
                    <View style={styles.voucherBottomRow}>
                      <View>
                        <Text style={styles.validText}>📅 Valid until {claim.validUntil}</Text>
                        {claim.savingsAmount && (
                          <Text style={styles.savingsTag}>Saved ₹{claim.savingsAmount}</Text>
                        )}
                      </View>

                      {isActive && (
                        <TouchableOpacity
                          style={styles.qrPassBtn}
                          onPress={() => setActiveQrModal(claim)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="qr-code" size={15} color="#FFFFFF" />
                          <Text style={styles.qrPassBtnText}>Show QR Pass</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── QR Redemption Pass Modal ─────────────────────────────────── */}
      <Modal visible={!!activeQrModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeading}>Resident Voucher Pass</Text>
                <Text style={styles.modalSubheading}>Scan at merchant checkout</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveQrModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {activeQrModal && (
              <View style={styles.modalBody}>
                <Text style={styles.qrBizTitle}>{activeQrModal.businessName}</Text>
                <Text style={styles.qrDealTitle}>{activeQrModal.offerTitle}</Text>

                {/* Big Simulated QR Box */}
                <View style={styles.bigQrBox}>
                  <Ionicons name="qr-code" size={160} color="#1E1B4B" />
                  <Text style={styles.bigCodeText}>{activeQrModal.voucherCode}</Text>
                  {activeQrModal.counterPin && (
                    <View style={styles.pinBox}>
                      <Text style={styles.pinLabel}>CASHIER PIN</Text>
                      <Text style={styles.pinVal}>{activeQrModal.counterPin}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.instructionText}>
                  Show this screen to the counter assistant or delivery agent to verify and apply your society resident discount.
                </Text>

                {/* Mark as Redeemed Action */}
                <TouchableOpacity
                  style={styles.redeemBtn}
                  onPress={() => redeemMutation.mutate(activeQrModal.id)}
                  disabled={redeemMutation.isPending}
                >
                  <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                  <Text style={styles.redeemBtnText}>Confirm Redeemed at Counter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={() => setActiveQrModal(null)}
                >
                  <Text style={styles.dismissBtnText}>Close Pass</Text>
                </TouchableOpacity>
              </View>
            )}
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
  walletHero: {
    backgroundColor: '#312E81',
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  walletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  walletPillText: { fontSize: 10, fontWeight: '800', color: '#D1FAE5' },
  savingsBox: { alignItems: 'flex-end' },
  savingsVal: { fontSize: 16, fontWeight: '900', color: '#34D399' },
  savingsLabel: { fontSize: 9, color: '#A7F3D0' },
  walletTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  walletDesc: { fontSize: 12, color: '#C7D2FE', lineHeight: 17, marginBottom: 14 },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.22)',
    padding: 10,
    borderRadius: RADIUS.md,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: { alignItems: 'center' },
  metricNum: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  metricLabel: { fontSize: 9, color: '#C7D2FE', marginTop: 1 },
  metricDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.18)' },

  // ── Tab Bar ───────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabBtnActive: { backgroundColor: COLORS.primaryLight },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  tabBtnTextActive: { color: COLORS.primary, fontWeight: '800' },

  // ── Claims List ───────────────────────────────────────────────────
  claimsList: { gap: SPACING.md },
  voucherCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
    ...SHADOWS.sm,
  },
  voucherTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  bizName: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  voucherTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  discountText: { fontSize: 12, fontWeight: '700', color: '#059669', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 10,
  },
  codeLabel: { fontSize: 9, fontWeight: '800', color: COLORS.primary },
  codeVal: { fontSize: 15, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  copyBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  voucherBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  validText: { fontSize: 11, color: COLORS.textMuted },
  savingsTag: { fontSize: 11, fontWeight: '800', color: '#D97706', marginTop: 2 },
  qrPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  qrPassBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  // ── Empty State ───────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  // ── Modal ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalHeading: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  modalSubheading: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  modalBody: { alignItems: 'center', marginTop: 12 },
  qrBizTitle: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  qrDealTitle: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  bigQrBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 12,
    width: '100%',
  },
  bigCodeText: { fontSize: 17, fontWeight: '900', color: '#1E1B4B', letterSpacing: 2, marginTop: 6 },
  pinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginTop: 6,
  },
  pinLabel: { fontSize: 9, fontWeight: '800', color: COLORS.primary },
  pinVal: { fontSize: 12, fontWeight: '900', color: COLORS.primary },
  instructionText: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 16, marginBottom: 14 },
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    width: '100%',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  redeemBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  dismissBtn: {
    marginTop: 10,
    paddingVertical: 8,
  },
  dismissBtnText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
});
