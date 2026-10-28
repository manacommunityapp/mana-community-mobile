import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  packageRoomService,
  PackageEntry,
  PackageStatus,
} from '@/services/packageRoomService';

const STATUS_META: Record<PackageStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  RECEIVED:  { label: 'In Room',   color: '#2563EB', bg: '#DBEAFE', icon: 'cube-outline' },
  NOTIFIED:  { label: 'Notified',  color: '#D97706', bg: '#FEF3C7', icon: 'notifications-outline' },
  COLLECTED: { label: 'Collected', color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle-outline' },
  RETURNED:  { label: 'Returned',  color: '#6B7280', bg: '#F3F4F6', icon: 'return-up-back-outline' },
  DISPUTED:  { label: 'Disputed',  color: '#EF4444', bg: '#FEE2E2', icon: 'alert-circle-outline' },
};

const COURIER_ICON: Record<string, string> = {
  AMAZON: '📦', FLIPKART: '🛍️', BLUEDART: '🚀', DTDC: '🚚',
  EKART: '🛒', DELHIVERY: '🔵', FEDEX: '🦊', OTHER: '📬',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function PackagesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [selectedPkg, setSelectedPkg] = useState<PackageEntry | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [collectModal, setCollectModal] = useState(false);
  const [otpModal, setOtpModal] = useState(false);

  const { data: packages = [], isLoading, refetch } = useQuery({
    queryKey: ['my-packages'],
    queryFn: () => packageRoomService.getMyPackages(),
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ['package-stats'],
    queryFn: () => packageRoomService.getStats(),
  });

  const otpMut = useMutation({
    mutationFn: (id: number) => packageRoomService.generateCollectionOtp(id),
    onSuccess: (data) => {
      if (selectedPkg) {
        setSelectedPkg({ ...selectedPkg, collectionOtp: data.otp, otpExpiresAt: data.expiresAt });
        setOtpModal(true);
      }
    },
  });

  const collectMut = useMutation({
    mutationFn: () => packageRoomService.collectPackage({ packageId: selectedPkg!.id, otp: otpInput }),
    onSuccess: () => {
      Alert.alert('Package Collected', 'Your package has been marked as collected.');
      setCollectModal(false);
      setOtpInput('');
      setSelectedPkg(null);
      qc.invalidateQueries({ queryKey: ['my-packages'] });
    },
    onError: () => Alert.alert('Error', 'Invalid OTP. Please try again.'),
  });

  const pending = packages.filter(p => p.status !== 'COLLECTED' && p.status !== 'RETURNED');
  const displayList = activeTab === 'pending' ? pending : packages;

  const renderPackage = ({ item }: { item: PackageEntry }) => {
    const meta = STATUS_META[item.status];
    const emoji = COURIER_ICON[item.courierPartner?.toString()] ?? '📬';
    return (
      <TouchableOpacity
        style={styles.pkgCard}
        onPress={() => { setSelectedPkg(item); setCollectModal(true); }}
        activeOpacity={0.85}
      >
        <View style={styles.pkgLeft}>
          <Text style={styles.emoji}>{emoji}</Text>
          <View style={styles.pkgInfo}>
            <Text style={styles.pkgTitle}>{item.senderName || item.courierPartner}</Text>
            {item.trackingNumber ? (
              <Text style={styles.tracking}>#{item.trackingNumber}</Text>
            ) : null}
            <Text style={styles.pkgTime}>{formatDate(item.receivedAt)}</Text>
          </View>
        </View>
        <View style={styles.pkgRight}>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {item.shelfNumber ? (
            <Text style={styles.shelf}>Shelf {item.shelfNumber}</Text>
          ) : null}
          {item.packageCount > 1 ? (
            <Text style={styles.count}>{item.packageCount} items</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Package Room</Text>
        {pending.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.collectedTodayCount}</Text>
            <Text style={styles.statLabel}>Today Collected</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.totalThisMonth}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['pending', 'all'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'pending' ? `Pending (${pending.length})` : 'All Packages'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayList}
        keyExtractor={i => String(i.id)}
        renderItem={renderPackage}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{activeTab === 'pending' ? 'No pending packages' : 'No packages found'}</Text>
          </View>
        }
      />

      {/* Package Detail / Collect Modal */}
      <Modal visible={collectModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Package Details</Text>
              <TouchableOpacity onPress={() => { setCollectModal(false); setSelectedPkg(null); }}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedPkg && (() => {
              const meta = STATUS_META[selectedPkg.status];
              const emoji = COURIER_ICON[selectedPkg.courierPartner?.toString()] ?? '📬';
              return (
                <View style={styles.modalBody}>
                  <Text style={styles.pkgEmoji}>{emoji}</Text>
                  <Text style={styles.modalCourier}>{selectedPkg.senderName || selectedPkg.courierPartner}</Text>
                  {selectedPkg.trackingNumber && <Text style={styles.modalTracking}>#{selectedPkg.trackingNumber}</Text>}
                  <View style={[styles.statusBadge, { backgroundColor: meta.bg, alignSelf: 'center', marginVertical: 8 }]}>
                    <Ionicons name={meta.icon} size={14} color={meta.color} />
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Received</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedPkg.receivedAt)}</Text>
                    </View>
                    {selectedPkg.shelfNumber && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Shelf</Text>
                        <Text style={styles.detailValue}>{selectedPkg.shelfNumber}</Text>
                      </View>
                    )}
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Items</Text>
                      <Text style={styles.detailValue}>{selectedPkg.packageCount}</Text>
                    </View>
                  </View>

                  {selectedPkg.status !== 'COLLECTED' && selectedPkg.status !== 'RETURNED' && (
                    <View style={styles.collectSection}>
                      {selectedPkg.collectionOtp ? (
                        <View style={styles.otpBox}>
                          <Text style={styles.otpLabel}>Collection OTP</Text>
                          <Text style={styles.otpCode}>{selectedPkg.collectionOtp}</Text>
                          <Text style={styles.otpHint}>Show this to security guard to collect</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.generateBtn}
                          onPress={() => otpMut.mutate(selectedPkg.id)}
                          disabled={otpMut.isPending}
                        >
                          {otpMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : (
                            <Text style={styles.generateBtnText}>Generate Collection OTP</Text>
                          )}
                        </TouchableOpacity>
                      )}

                      <TextInput
                        style={styles.otpInput}
                        placeholder="Enter OTP to confirm collection"
                        value={otpInput}
                        onChangeText={setOtpInput}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      <TouchableOpacity
                        style={[styles.confirmBtn, !otpInput && styles.confirmBtnDisabled]}
                        onPress={() => collectMut.mutate()}
                        disabled={!otpInput || collectMut.isPending}
                      >
                        {collectMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : (
                          <Text style={styles.confirmBtnText}>Confirm Collection</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12, backgroundColor: THEME.card, borderBottomWidth: 1, borderBottomColor: THEME.border },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: THEME.text, fontFamily: 'DMSans-Bold' },
  badge: { backgroundColor: '#D97706', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', padding: SPACING.md, gap: 10 },
  statCard: { flex: 1, backgroundColor: THEME.card, borderRadius: RADIUS.lg, padding: 12, alignItems: 'center', ...SHADOWS.sm },
  statNum: { fontSize: 22, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans-Bold' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'center', fontFamily: 'DMSans-Regular' },
  tabs: { flexDirection: 'row', backgroundColor: THEME.card, borderBottomWidth: 1, borderBottomColor: THEME.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, color: COLORS.textMuted, fontFamily: 'DMSans-Medium', fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  list: { padding: SPACING.md, gap: 10 },
  pkgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, borderRadius: RADIUS.lg, padding: 14, ...SHADOWS.sm },
  pkgLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 28 },
  pkgInfo: {},
  pkgTitle: { fontSize: 15, fontWeight: '600', color: THEME.text, fontFamily: 'DMSans-SemiBold' },
  tracking: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  pkgTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  pkgRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  shelf: { fontSize: 11, color: COLORS.textMuted },
  count: { fontSize: 11, color: COLORS.primary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: THEME.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: THEME.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: THEME.text, fontFamily: 'DMSans-Bold' },
  modalBody: { padding: 20, alignItems: 'center', gap: 8 },
  pkgEmoji: { fontSize: 48 },
  modalCourier: { fontSize: 20, fontWeight: '700', color: THEME.text, fontFamily: 'DMSans-Bold' },
  modalTracking: { fontSize: 13, color: COLORS.textMuted },
  detailGrid: { flexDirection: 'row', gap: 16, marginVertical: 8 },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  detailValue: { fontSize: 13, fontWeight: '600', color: THEME.text, fontFamily: 'DMSans-SemiBold', marginTop: 2 },
  collectSection: { width: '100%', gap: 12, marginTop: 8 },
  otpBox: { backgroundColor: '#FEF3C7', borderRadius: RADIUS.lg, padding: 16, alignItems: 'center' },
  otpLabel: { fontSize: 12, color: '#92400E', fontFamily: 'DMSans-Medium', fontWeight: '500' },
  otpCode: { fontSize: 32, fontWeight: '700', color: '#92400E', letterSpacing: 8, fontFamily: 'DMSans-Bold', marginVertical: 4 },
  otpHint: { fontSize: 11, color: '#B45309', textAlign: 'center' },
  generateBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  otpInput: { backgroundColor: THEME.background, borderWidth: 1, borderColor: THEME.border, borderRadius: RADIUS.lg, padding: 14, fontSize: 18, textAlign: 'center', letterSpacing: 6, color: THEME.text, fontWeight: '700' },
  confirmBtn: { backgroundColor: '#22C55E', borderRadius: RADIUS.lg, padding: 14, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans-Bold' },
});
