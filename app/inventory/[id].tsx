import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  inventoryService,
  InventoryItem,
  AssetAuditLog,
  ItemStatus,
  CheckoutRequest,
} from '@/services/inventoryService';

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  AVAILABLE:   { label: 'Available',   color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle' },
  BORROWED:    { label: 'Borrowed',    color: '#D97706', bg: '#FEF3C7', icon: 'arrow-redo' },
  MAINTENANCE: { label: 'Maintenance', color: '#2563EB', bg: '#DBEAFE', icon: 'construct' },
  LOST:        { label: 'Lost',        color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle' },
  DISPOSED:    { label: 'Disposed',    color: '#6B7280', bg: '#F3F4F6', icon: 'trash' },
};

export default function AssetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  // Checkout form
  const [borrower, setBorrower] = useState('');
  const [borrowerFlat, setBorrowerFlat] = useState('');
  const [returnDate, setReturnDate] = useState('');

  // Audit form
  const [expectedQty, setExpectedQty] = useState('1');
  const [actualQty, setActualQty] = useState('1');
  const [auditNotes, setAuditNotes] = useState('');

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/inventory');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showCheckout) { setShowCheckout(false); return true; }
        if (showAudit) { setShowAudit(false); return true; }
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack, showCheckout, showAudit])
  );

  const assetId = parseInt(id || '0', 10);

  const {
    data: asset,
    isLoading,
    refetch,
  } = useQuery<InventoryItem>({
    queryKey: ['inventory', 'item', assetId],
    queryFn: () => inventoryService.getItemById(assetId),
    enabled: assetId > 0,
    staleTime: 15_000,
  });

  const {
    data: auditHistory = [],
    refetch: refetchAudit,
  } = useQuery<AssetAuditLog[]>({
    queryKey: ['inventory', 'audit', assetId],
    queryFn: () => inventoryService.getAuditLogsByAsset(assetId),
    enabled: assetId > 0,
    staleTime: 30_000,
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: CheckoutRequest) => inventoryService.checkoutItem(assetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowCheckout(false);
      resetCheckoutForm();
      Alert.alert('Checked Out', 'Asset has been checked out successfully.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Checkout failed.'),
  });

  const checkinMutation = useMutation({
    mutationFn: () => inventoryService.checkinItem(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      Alert.alert('Returned', 'Asset has been returned to inventory.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Check-in failed.'),
  });

  const auditMutation = useMutation({
    mutationFn: () =>
      inventoryService.createAuditLog(assetId, {
        auditedBy: user?.name || user?.email || 'Unknown',
        expectedQuantity: parseInt(expectedQty, 10) || 1,
        actualQuantity: parseInt(actualQty, 10) || 1,
        notes: auditNotes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowAudit(false);
      resetAuditForm();
      Alert.alert('Audit Recorded', 'Physical audit has been logged.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Audit submission failed.'),
  });

  const maintenanceMutation = useMutation({
    mutationFn: () => inventoryService.scheduleMaintenance(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      Alert.alert('Maintenance Scheduled', 'Asset has been marked for maintenance.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to schedule maintenance.'),
  });

  const resetCheckoutForm = () => { setBorrower(''); setBorrowerFlat(''); setReturnDate(''); };
  const resetAuditForm = () => { setExpectedQty('1'); setActualQty('1'); setAuditNotes(''); };

  const handleCheckout = () => {
    if (!borrower.trim()) { Alert.alert('Required', 'Enter borrower name.'); return; }
    if (!borrowerFlat.trim()) { Alert.alert('Required', 'Enter flat number.'); return; }
    checkoutMutation.mutate({
      borrowedBy: borrower.trim(),
      borrowedByFlat: borrowerFlat.trim(),
      expectedReturnAt: returnDate.trim() || undefined,
    });
  };

  const handleCheckin = () => {
    Alert.alert('Return Asset', 'Confirm return of this asset to inventory?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm Return', onPress: () => checkinMutation.mutate() },
    ]);
  };

  const handleMaintenance = () => {
    Alert.alert('Schedule Maintenance', 'Mark this asset for maintenance?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Schedule', onPress: () => maintenanceMutation.mutate() },
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetch(), refetchAudit()]);
    setRefreshing(false);
  }, [refetch, refetchAudit]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Loading asset details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!asset) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Asset Not Found</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.centerContainer}>
          <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>Asset not found</Text>
          <Text style={s.emptySub}>This item may have been removed or is unavailable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = STATUS_CONFIG[asset.status] || STATUS_CONFIG.AVAILABLE;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle} numberOfLines={1}>Asset Details</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
      >
        {/* ── Asset Card ── */}
        <View style={s.detailCard}>
          <View style={s.detailHeader}>
            <View style={s.detailIconBox}>
              <Ionicons name="cube" size={28} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={s.detailName}>{asset.name}</Text>
              {asset.category && (
                <Text style={s.detailCategory}>{asset.category}</Text>
              )}
            </View>
            <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Ionicons name={statusCfg.icon} size={13} color={statusCfg.color} />
              <Text style={[s.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>

          {/* Info Grid */}
          <View style={s.infoGrid}>
            {asset.serialNumber && (
              <InfoRow icon="barcode-outline" label="Serial No." value={asset.serialNumber} />
            )}
            {asset.location && (
              <InfoRow icon="location-outline" label="Location" value={asset.location} />
            )}
            {asset.qrCodeId && (
              <InfoRow icon="qr-code-outline" label="QR Code" value={asset.qrCodeId} />
            )}
            {asset.vendorName && (
              <InfoRow icon="storefront-outline" label="Vendor" value={asset.vendorName} />
            )}
            {asset.purchaseDate && (
              <InfoRow icon="calendar-outline" label="Purchase Date" value={asset.purchaseDate} />
            )}
            {asset.warrantyExpiryDate && (
              <InfoRow icon="shield-outline" label="Warranty Until" value={asset.warrantyExpiryDate} />
            )}
          </View>

          {/* Financial */}
          {(asset.originalCost != null || asset.currentValue != null) && (
            <View style={s.financialRow}>
              {asset.originalCost != null && (
                <View style={s.financialItem}>
                  <Text style={s.finLabel}>Original Cost</Text>
                  <Text style={s.finValue}>{'₹'}{asset.originalCost.toLocaleString('en-IN')}</Text>
                </View>
              )}
              {asset.currentValue != null && (
                <View style={s.financialItem}>
                  <Text style={s.finLabel}>Book Value</Text>
                  <Text style={s.finValue}>{'₹'}{asset.currentValue.toLocaleString('en-IN')}</Text>
                </View>
              )}
              {asset.tco != null && (
                <View style={s.financialItem}>
                  <Text style={s.finLabel}>TCO</Text>
                  <Text style={s.finValue}>{'₹'}{asset.tco.toLocaleString('en-IN')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Borrower Info */}
          {asset.status === 'BORROWED' && asset.borrowedBy && (
            <View style={s.borrowerSection}>
              <Text style={s.sectionLabel}>Currently Checked Out</Text>
              <View style={s.borrowerCard}>
                <View style={s.borrowerRow}>
                  <Ionicons name="person" size={14} color="#D97706" />
                  <Text style={s.borrowerName}>{asset.borrowedBy}</Text>
                  {asset.borrowedByFlat && (
                    <Text style={s.borrowerFlat}>({asset.borrowedByFlat})</Text>
                  )}
                </View>
                {asset.borrowedAt && (
                  <View style={s.borrowerRow}>
                    <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                    <Text style={s.borrowerMeta}>Since {asset.borrowedAt}</Text>
                  </View>
                )}
                {asset.expectedReturn && (
                  <View style={s.borrowerRow}>
                    <Ionicons name="return-down-back-outline" size={12} color={COLORS.textMuted} />
                    <Text style={s.borrowerMeta}>Expected: {asset.expectedReturn}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Maintenance Info */}
          {asset.nextMaintenanceDueAt && (
            <View style={s.maintenanceBar}>
              <Ionicons name="construct-outline" size={14} color="#2563EB" />
              <Text style={s.maintenanceText}>
                Next maintenance: {asset.nextMaintenanceDueAt}
              </Text>
            </View>
          )}

          {/* Last Audit */}
          {asset.lastAuditedAt && (
            <View style={s.auditBar}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#059669" />
              <Text style={s.auditBarText}>
                Last audit: {asset.lastAuditedAt}
                {asset.auditVariance != null && asset.auditVariance !== 0 && (
                  ` (variance: ${asset.auditVariance})`
                )}
              </Text>
            </View>
          )}
        </View>

        {/* ── Action Buttons ── */}
        <View style={s.actionsSection}>
          <Text style={s.sectionLabel}>Actions</Text>
          <View style={s.actionsGrid}>
            {asset.status === 'AVAILABLE' && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#FEF3C7' }]}
                onPress={() => {
                  setBorrower(user?.name || '');
                  setBorrowerFlat(user?.flatNumber || '');
                  setShowCheckout(true);
                }}
              >
                <Ionicons name="arrow-redo" size={20} color="#D97706" />
                <Text style={[s.actionBtnText, { color: '#92400E' }]}>Check Out</Text>
              </TouchableOpacity>
            )}
            {asset.status === 'BORROWED' && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#D1FAE5' }]}
                onPress={handleCheckin}
                disabled={checkinMutation.isPending}
              >
                {checkinMutation.isPending ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <>
                    <Ionicons name="return-down-back" size={20} color="#059669" />
                    <Text style={[s.actionBtnText, { color: '#065F46' }]}>Return Item</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#DBEAFE' }]}
              onPress={handleMaintenance}
              disabled={maintenanceMutation.isPending}
            >
              {maintenanceMutation.isPending ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <>
                  <Ionicons name="construct" size={20} color="#2563EB" />
                  <Text style={[s.actionBtnText, { color: '#1E40AF' }]}>Maintenance</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#EEF2FF' }]}
              onPress={() => setShowAudit(true)}
            >
              <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
              <Text style={[s.actionBtnText, { color: COLORS.primary }]}>Audit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Audit History ── */}
        {auditHistory.length > 0 && (
          <View style={s.historySection}>
            <Text style={s.sectionLabel}>Audit History</Text>
            {auditHistory.slice(0, 10).map((log) => {
              const hasVariance = log.variance !== 0;
              return (
                <View key={log.id} style={s.historyCard}>
                  <View style={s.historyHeader}>
                    <Ionicons
                      name={hasVariance ? 'warning-outline' : 'checkmark-circle'}
                      size={14}
                      color={hasVariance ? '#DC2626' : '#059669'}
                    />
                    <Text style={s.historyDate}>
                      {new Date(log.auditedAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                    <Text style={s.historyAuditor}>by {log.auditedBy}</Text>
                  </View>
                  <View style={s.historyStatsRow}>
                    <Text style={s.historyStatText}>
                      Expected: {log.expectedQuantity} | Actual: {log.actualQuantity} | Variance: {log.variance > 0 ? '+' : ''}{log.variance}
                    </Text>
                  </View>
                  {log.notes && (
                    <Text style={s.historyNotes} numberOfLines={2}>{log.notes}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Checkout Modal ── */}
      <Modal visible={showCheckout} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Check Out Asset</Text>
              <TouchableOpacity
                onPress={() => { setShowCheckout(false); resetCheckoutForm(); }}
                disabled={checkoutMutation.isPending}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.modalAssetPreview}>
              <Ionicons name="cube" size={18} color={COLORS.primary} />
              <Text style={s.modalAssetName} numberOfLines={1}>{asset.name}</Text>
            </View>

            <Text style={s.fieldLabel}>Borrower Name *</Text>
            <TextInput
              style={s.fieldInput}
              placeholder="Name of person checking out"
              placeholderTextColor={COLORS.textMuted}
              value={borrower}
              onChangeText={setBorrower}
            />

            <Text style={s.fieldLabel}>Flat / Unit *</Text>
            <TextInput
              style={s.fieldInput}
              placeholder="e.g. A-1204"
              placeholderTextColor={COLORS.textMuted}
              value={borrowerFlat}
              onChangeText={setBorrowerFlat}
            />

            <Text style={s.fieldLabel}>Expected Return Date</Text>
            <TextInput
              style={s.fieldInput}
              placeholder="YYYY-MM-DD (optional)"
              placeholderTextColor={COLORS.textMuted}
              value={returnDate}
              onChangeText={setReturnDate}
            />

            <View style={s.modalActionRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowCheckout(false); resetCheckoutForm(); }}
                disabled={checkoutMutation.isPending}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, checkoutMutation.isPending && { opacity: 0.6 }]}
                disabled={checkoutMutation.isPending}
                onPress={handleCheckout}
              >
                {checkoutMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>Confirm Checkout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Audit Modal ── */}
      <Modal visible={showAudit} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Physical Audit</Text>
              <TouchableOpacity
                onPress={() => { setShowAudit(false); resetAuditForm(); }}
                disabled={auditMutation.isPending}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.modalAssetPreview}>
              <Ionicons name="cube" size={18} color={COLORS.primary} />
              <Text style={s.modalAssetName} numberOfLines={1}>{asset.name}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: SPACING.md }}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Expected Qty *</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="1"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={expectedQty}
                  onChangeText={setExpectedQty}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Actual Qty *</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="1"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={actualQty}
                  onChangeText={setActualQty}
                />
              </View>
            </View>

            {parseInt(expectedQty, 10) !== parseInt(actualQty, 10) && (
              <View style={s.varianceWarning}>
                <Ionicons name="warning-outline" size={14} color="#DC2626" />
                <Text style={s.varianceText}>
                  Variance: {(parseInt(actualQty, 10) || 0) - (parseInt(expectedQty, 10) || 0)}
                </Text>
              </View>
            )}

            <Text style={s.fieldLabel}>Notes</Text>
            <TextInput
              style={[s.fieldInput, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Physical condition, location verified, etc."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              value={auditNotes}
              onChangeText={setAuditNotes}
            />

            <View style={s.modalActionRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowAudit(false); resetAuditForm(); }}
                disabled={auditMutation.isPending}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, auditMutation.isPending && { opacity: 0.6 }]}
                disabled={auditMutation.isPending}
                onPress={() => auditMutation.mutate()}
              >
                {auditMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>Submit Audit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoRowLeft}>
        <Ionicons name={icon} size={14} color={COLORS.textMuted} />
        <Text style={s.infoLabel}>{label}</Text>
      </View>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 8 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular', paddingHorizontal: 30 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.12)',
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },

  scrollContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },

  // Detail card
  detailCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center' },
  detailIconBox: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  detailName: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  detailCategory: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  // Info grid
  infoGrid: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  infoValue: { fontSize: 12, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans-Medium' },

  // Financial
  financialRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  financialItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
  },
  finLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  finValue: { fontSize: 14, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 2 },

  // Borrower
  borrowerSection: { marginTop: SPACING.md },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  borrowerCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
  },
  borrowerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  borrowerName: { fontSize: 13, fontWeight: '700', color: '#92400E', fontFamily: 'Outfit-Bold' },
  borrowerFlat: { fontSize: 12, color: '#92400E', fontFamily: 'DMSans-Regular' },
  borrowerMeta: { fontSize: 11, color: '#78716C', fontFamily: 'DMSans-Regular' },

  // Maintenance & Audit bars
  maintenanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  maintenanceText: { fontSize: 11, color: '#1E40AF', fontFamily: 'DMSans-Medium' },
  auditBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  auditBarText: { fontSize: 11, color: '#065F46', fontFamily: 'DMSans-Medium' },

  // Actions
  actionsSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
  },
  actionBtnText: { fontSize: 12, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  // History
  historySection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  historyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyDate: { fontSize: 11, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  historyAuditor: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  historyStatsRow: { marginTop: 4 },
  historyStatText: { fontSize: 10, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },
  historyNotes: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2, fontStyle: 'italic' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },

  modalAssetPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modalAssetName: { fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold', flex: 1 },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'DMSans-Regular',
  },

  varianceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  varianceText: { fontSize: 12, fontWeight: '700', color: '#DC2626', fontFamily: 'Outfit-Bold' },

  modalActionRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
