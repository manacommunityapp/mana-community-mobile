import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, RefreshControl, ActivityIndicator, Modal, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import {
  packageRoomService,
  type PackageEntry,
  type PackageStatus,
  type CourierPartner,
} from '@/services/packageRoomService';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type FilterTab = 'PENDING' | 'NOTIFIED' | 'COLLECTED';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'NOTIFIED', label: 'Notified' },
  { key: 'COLLECTED', label: 'Collected' },
];

const STATUS_META: Record<PackageStatus, { color: string; bg: string; icon: IoniconsName; label: string }> = {
  RECEIVED:  { color: '#D97706', bg: '#FEF3C7', icon: 'cube',             label: 'Received' },
  NOTIFIED:  { color: '#2563EB', bg: '#DBEAFE', icon: 'notifications',    label: 'Notified' },
  COLLECTED: { color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle', label: 'Collected' },
  RETURNED:  { color: '#6B7280', bg: '#F3F4F6', icon: 'return-up-back',   label: 'Returned' },
  DISPUTED:  { color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle',     label: 'Disputed' },
};

const COURIER_COLORS: Record<string, string> = {
  AMAZON: '#FF9900', FLIPKART: '#2874F0', BLUEDART: '#003399',
  DTDC: '#F05A28', EKART: '#2874F0', DELHIVERY: '#D61F26',
  FEDEX: '#4D148C', OTHER: '#6B7280',
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Stats tile ────────────────────────────────────────────────────────────────

function StatTile({ value, label, color, icon, bg }: {
  value: number; label: string; color: string; icon: IoniconsName; bg: string;
}) {
  return (
    <View style={ps.statTile}>
      <View style={[ps.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[ps.statValue, { color }]}>{value}</Text>
      <Text style={ps.statLabel}>{label}</Text>
    </View>
  );
}

// ── Package card ──────────────────────────────────────────────────────────────

interface PackageCardProps {
  pkg: PackageEntry;
  expanded: boolean;
  onToggle: () => void;
  onGenerateOtp: (id: number) => void;
  onVerifyOtp: (pkg: PackageEntry) => void;
  generatingOtp: boolean;
}

function PackageCard({ pkg, expanded, onToggle, onGenerateOtp, onVerifyOtp, generatingOtp }: PackageCardProps) {
  const meta = STATUS_META[pkg.status] ?? STATUS_META['RECEIVED'];
  const courierColor = COURIER_COLORS[pkg.courierPartner] ?? COURIER_COLORS['OTHER'];

  return (
    <TouchableOpacity style={ps.pkgCard} onPress={onToggle} activeOpacity={0.8}>
      <View style={ps.pkgHeader}>
        <View style={[ps.pkgIconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
        <View style={ps.pkgInfo}>
          <View style={ps.pkgInfoRow}>
            <Text style={ps.pkgFlat}>Flat {pkg.flatNumber}</Text>
            <Text style={ps.pkgSep}>·</Text>
            <View style={[ps.courierBadge, { backgroundColor: courierColor + '22' }]}>
              <Text style={[ps.courierText, { color: courierColor }]}>{pkg.courierPartner}</Text>
            </View>
          </View>
          <Text style={ps.pkgResident} numberOfLines={1}>{pkg.residentName ?? 'Resident'}</Text>
          {pkg.shelfNumber && (
            <Text style={ps.pkgShelf}>Shelf {pkg.shelfNumber}</Text>
          )}
        </View>
        <View style={ps.pkgRight}>
          <View style={[ps.statusPill, { backgroundColor: meta.bg }]}>
            <Text style={[ps.statusPillText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={ps.pkgTime}>{timeAgo(pkg.receivedAt)}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.textMuted}
          style={{ marginLeft: 4 }}
        />
      </View>

      {pkg.trackingNumber && (
        <Text style={ps.trackingNum}>#{pkg.trackingNumber}</Text>
      )}

      {/* Expanded detail */}
      {expanded && (
        <View style={ps.pkgExpanded}>
          <View style={ps.pkgDetailGrid}>
            <View style={ps.pkgDetailItem}>
              <Text style={ps.pkgDetailLabel}>Received</Text>
              <Text style={ps.pkgDetailVal}>{fmtDateTime(pkg.receivedAt)}</Text>
            </View>
            {pkg.packageCount > 1 && (
              <View style={ps.pkgDetailItem}>
                <Text style={ps.pkgDetailLabel}>Items</Text>
                <Text style={ps.pkgDetailVal}>{pkg.packageCount} items</Text>
              </View>
            )}
            {pkg.description && (
              <View style={ps.pkgDetailItem}>
                <Text style={ps.pkgDetailLabel}>Description</Text>
                <Text style={ps.pkgDetailVal}>{pkg.description}</Text>
              </View>
            )}
            {pkg.collectionOtp && pkg.status !== 'COLLECTED' && (
              <View style={ps.pkgDetailItem}>
                <Text style={ps.pkgDetailLabel}>OTP</Text>
                <Text style={[ps.pkgDetailVal, { fontFamily: 'DMSans-Bold', letterSpacing: 2 }]}>{pkg.collectionOtp}</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={ps.pkgActions}>
            {(pkg.status === 'RECEIVED' || pkg.status === 'NOTIFIED') && !pkg.collectionOtp && (
              <TouchableOpacity
                style={[ps.pkgActionBtn, ps.pkgActionBtnBlue, generatingOtp && { opacity: 0.7 }]}
                onPress={() => onGenerateOtp(pkg.id)}
                disabled={generatingOtp}
              >
                {generatingOtp ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="key-outline" size={14} color="#fff" />
                    <Text style={ps.pkgActionBtnText}>Generate OTP</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {(pkg.status === 'NOTIFIED' || (pkg.status === 'RECEIVED' && pkg.collectionOtp)) && (
              <TouchableOpacity
                style={[ps.pkgActionBtn, ps.pkgActionBtnGreen]}
                onPress={() => onVerifyOtp(pkg)}
              >
                <Ionicons name="checkmark-done-outline" size={14} color="#fff" />
                <Text style={ps.pkgActionBtnText}>Verify Collection</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── New parcel modal ──────────────────────────────────────────────────────────

interface NewParcelModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Partial<PackageEntry>) => Promise<void>;
}

function NewParcelModal({ visible, onClose, onSave }: NewParcelModalProps) {
  const [flatNumber, setFlatNumber] = useState('');
  const [courierPartner, setCourierPartner] = useState<CourierPartner>('OTHER');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shelfNumber, setShelfNumber] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const couriers: CourierPartner[] = ['AMAZON', 'FLIPKART', 'BLUEDART', 'DTDC', 'EKART', 'DELHIVERY', 'FEDEX', 'OTHER'];

  const handleSave = async () => {
    if (!flatNumber.trim()) return;
    setSaving(true);
    try {
      await onSave({ flatNumber, courierPartner, trackingNumber, shelfNumber, description, packageCount: 1 });
      setFlatNumber(''); setCourierPartner('OTHER'); setTrackingNumber('');
      setShelfNumber(''); setDescription('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={ps.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={ps.modalSheet}>
          <View style={ps.modalHandle} />
          <View style={ps.modalHeader}>
            <Ionicons name="cube" size={20} color={GUARD_COLORS.accent} />
            <Text style={ps.modalTitle}>Log New Parcel</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={ps.modalFields}>
              <View style={ps.field}>
                <Text style={ps.fieldLabel}>Flat Number *</Text>
                <TextInput
                  style={ps.fieldInput}
                  placeholder="e.g. A-1204"
                  placeholderTextColor={COLORS.textMuted}
                  value={flatNumber}
                  onChangeText={setFlatNumber}
                  autoCapitalize="characters"
                />
              </View>

              <View style={ps.field}>
                <Text style={ps.fieldLabel}>Courier / Sender</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ps.courierPicker}>
                  {couriers.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[ps.courierChip, courierPartner === c && ps.courierChipActive]}
                      onPress={() => setCourierPartner(c)}
                    >
                      <Text style={[ps.courierChipText, courierPartner === c && ps.courierChipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={ps.field}>
                <Text style={ps.fieldLabel}>Tracking Number</Text>
                <TextInput
                  style={ps.fieldInput}
                  placeholder="Optional"
                  placeholderTextColor={COLORS.textMuted}
                  value={trackingNumber}
                  onChangeText={setTrackingNumber}
                  autoCapitalize="characters"
                />
              </View>

              <View style={ps.field}>
                <Text style={ps.fieldLabel}>Shelf Number</Text>
                <TextInput
                  style={ps.fieldInput}
                  placeholder="e.g. A-12"
                  placeholderTextColor={COLORS.textMuted}
                  value={shelfNumber}
                  onChangeText={setShelfNumber}
                  autoCapitalize="characters"
                />
              </View>

              <View style={ps.field}>
                <Text style={ps.fieldLabel}>Description</Text>
                <TextInput
                  style={[ps.fieldInput, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="Optional description"
                  placeholderTextColor={COLORS.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>
            </View>
          </ScrollView>

          <View style={ps.modalActions}>
            <TouchableOpacity style={ps.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={ps.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ps.submitBtn, (!flatNumber.trim() || saving) && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={!flatNumber.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={ps.submitBtnText}>Log Parcel</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── OTP verify modal ──────────────────────────────────────────────────────────

interface OtpVerifyModalProps {
  visible: boolean;
  pkg: PackageEntry | null;
  onClose: () => void;
  onVerify: (pkgId: number, otp: string) => Promise<void>;
}

function OtpVerifyModal({ visible, pkg, onClose, onVerify }: OtpVerifyModalProps) {
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!pkg || otp.length < 4) return;
    setVerifying(true);
    setError('');
    try {
      await onVerify(pkg.id, otp);
      setOtp('');
    } catch (e: any) {
      setError(e?.message ?? 'Verification failed. Check OTP and try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={ps.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={ps.modalSheet}>
          <View style={ps.modalHandle} />
          <View style={ps.modalHeader}>
            <Ionicons name="checkmark-done" size={20} color="#059669" />
            <Text style={ps.modalTitle}>Verify Collection</Text>
          </View>

          {pkg && (
            <View style={ps.otpPkgInfo}>
              <Text style={ps.otpPkgFlat}>Flat {pkg.flatNumber}</Text>
              <Text style={ps.otpPkgSub}>{pkg.courierPartner}{pkg.shelfNumber ? `  ·  Shelf ${pkg.shelfNumber}` : ''}</Text>
            </View>
          )}

          <View style={ps.field}>
            <Text style={ps.fieldLabel}>Enter OTP provided by resident</Text>
            <TextInput
              style={[ps.fieldInput, ps.otpInput]}
              placeholder="6-digit OTP"
              placeholderTextColor={COLORS.textMuted}
              value={otp}
              onChangeText={v => { setOtp(v.replace(/[^0-9]/g, '')); setError(''); }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          {error ? (
            <View style={ps.otpError}>
              <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
              <Text style={ps.otpErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={[ps.modalActions, { marginTop: 16 }]}>
            <TouchableOpacity style={ps.cancelBtn} onPress={onClose} disabled={verifying}>
              <Text style={ps.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ps.submitBtn, ps.submitBtnGreen, (otp.length < 4 || verifying) && { opacity: 0.6 }]}
              onPress={handleVerify}
              disabled={otp.length < 4 || verifying}
            >
              {verifying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={ps.submitBtnText}>Confirm Collection</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function GuardParcelsScreen() {
  const [filterTab, setFilterTab] = useState<FilterTab>('PENDING');
  const [packages, setPackages] = useState<PackageEntry[]>([]);
  const [stats, setStats] = useState({ pendingCount: 0, collectedTodayCount: 0, totalThisMonth: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [generatingOtpId, setGeneratingOtpId] = useState<number | null>(null);
  const [newParcelVisible, setNewParcelVisible] = useState(false);
  const [otpPkg, setOtpPkg] = useState<PackageEntry | null>(null);

  const loadData = useCallback(async () => {
    const [allRes, statsRes] = await Promise.allSettled([
      packageRoomService.getAllPackages(),
      packageRoomService.getStats(),
    ]);
    if (allRes.status === 'fulfilled') setPackages(allRes.value);
    if (statsRes.status === 'fulfilled') setStats(statsRes.value);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadData();
  }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleGenerateOtp = useCallback(async (pkgId: number) => {
    setGeneratingOtpId(pkgId);
    try {
      const result = await packageRoomService.generateCollectionOtp(pkgId);
      setPackages(prev => prev.map(p =>
        p.id === pkgId
          ? { ...p, collectionOtp: result.otp, otpExpiresAt: result.expiresAt, status: 'NOTIFIED' }
          : p,
      ));
    } catch {
      // silently ignore — mock returns otp anyway
    } finally {
      setGeneratingOtpId(null);
    }
  }, []);

  const handleVerifyOtp = useCallback(async (pkgId: number, otp: string) => {
    const result = await packageRoomService.collectPackage({ packageId: pkgId, otp });
    if (!result.success) throw new Error(result.message || 'Incorrect OTP');
    setPackages(prev => prev.map(p =>
      p.id === pkgId ? { ...p, status: 'COLLECTED', collectedAt: new Date().toISOString() } : p,
    ));
    setStats(prev => ({
      ...prev,
      pendingCount: Math.max(0, prev.pendingCount - 1),
      collectedTodayCount: prev.collectedTodayCount + 1,
    }));
    setOtpPkg(null);
  }, []);

  const handleLogNewParcel = useCallback(async (data: Partial<PackageEntry>) => {
    const saved = await packageRoomService.addPackage(data);
    setPackages(prev => [saved, ...prev]);
    setStats(prev => ({ ...prev, pendingCount: prev.pendingCount + 1, totalThisMonth: prev.totalThisMonth + 1 }));
    setNewParcelVisible(false);
  }, []);

  const filterStatusMap: Record<FilterTab, PackageStatus[]> = {
    PENDING:   ['RECEIVED'],
    NOTIFIED:  ['NOTIFIED'],
    COLLECTED: ['COLLECTED', 'RETURNED'],
  };
  const displayed = packages.filter(p => filterStatusMap[filterTab].includes(p.status));

  return (
    <SafeAreaView style={ps.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={ps.header}>
        <View style={ps.headerLeft}>
          <View style={ps.headerIconWrap}>
            <Ionicons name="cube" size={20} color={GUARD_COLORS.accent} />
          </View>
          <View>
            <Text style={ps.headerTitle}>Package Room</Text>
            <Text style={ps.headerSub}>Guard · parcel intake &amp; collection</Text>
          </View>
        </View>
        <TouchableOpacity style={ps.addBtn} onPress={() => setNewParcelVisible(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Stats ── */}
      <View style={ps.statsRow}>
        <StatTile value={stats.pendingCount} label="Pending" color="#D97706" icon="cube-outline" bg="#FEF3C7" />
        <StatTile value={stats.collectedTodayCount} label="Collected Today" color="#059669" icon="checkmark-circle-outline" bg="#D1FAE5" />
        <StatTile value={stats.totalThisMonth} label="This Month" color={GUARD_COLORS.accent} icon="calendar-outline" bg={GUARD_COLORS.accentLight} />
      </View>

      {/* ── Filter tabs ── */}
      <View style={ps.tabRow}>
        {FILTER_TABS.map(t => {
          const count = packages.filter(p => filterStatusMap[t.key].includes(p.status)).length;
          return (
            <TouchableOpacity
              key={t.key}
              style={[ps.tabBtn, filterTab === t.key && ps.tabBtnActive]}
              onPress={() => setFilterTab(t.key)}
            >
              <Text style={[ps.tabBtnText, filterTab === t.key && ps.tabBtnTextActive]}>{t.label}</Text>
              {count > 0 && (
                <View style={[ps.tabBadge, filterTab === t.key && ps.tabBadgeActive]}>
                  <Text style={[ps.tabBadgeText, filterTab === t.key && ps.tabBadgeTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />}
        contentContainerStyle={ps.scroll}
      >
        {loading ? (
          <View style={ps.loadingWrap}>
            <ActivityIndicator size="large" color={GUARD_COLORS.accent} />
          </View>
        ) : displayed.length === 0 ? (
          <View style={ps.emptyWrap}>
            <View style={ps.emptyIconBox}>
              <Ionicons name="cube-outline" size={48} color={GUARD_COLORS.accent} />
            </View>
            <Text style={ps.emptyTitle}>No {filterTab.toLowerCase()} packages</Text>
            <Text style={ps.emptyDesc}>
              {filterTab === 'PENDING'
                ? "Tap + to log a new parcel as it arrives at the gate."
                : filterTab === 'NOTIFIED'
                ? "Packages awaiting resident collection will appear here."
                : "Collected packages will be listed here."}
            </Text>
            {filterTab === 'PENDING' && (
              <TouchableOpacity style={ps.emptyAddBtn} onPress={() => setNewParcelVisible(true)}>
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={ps.emptyAddBtnText}>Log New Parcel</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={ps.packageList}>
            {displayed.map(pkg => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                expanded={expandedId === pkg.id}
                onToggle={() => setExpandedId(prev => prev === pkg.id ? null : pkg.id)}
                onGenerateOtp={handleGenerateOtp}
                onVerifyOtp={p => setOtpPkg(p)}
                generatingOtp={generatingOtpId === pkg.id}
              />
            ))}
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      <NewParcelModal
        visible={newParcelVisible}
        onClose={() => setNewParcelVisible(false)}
        onSave={handleLogNewParcel}
      />

      <OtpVerifyModal
        visible={!!otpPkg}
        pkg={otpPkg}
        onClose={() => setOtpPkg(null)}
        onVerify={handleVerifyOtp}
      />
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const ps = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconWrap: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: GUARD_COLORS.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  addBtn: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: GUARD_COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },

  statsRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: SPACING.md, marginTop: 14, marginBottom: 4,
  },
  statTile: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: 12,
    alignItems: 'center', gap: 4,
    ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  statIcon: {
    width: 32, height: 32, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  statValue: { fontSize: 20, fontFamily: 'DMSans-Bold', fontWeight: '700' },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', textAlign: 'center' },

  tabRow: {
    flexDirection: 'row', gap: 8,
    marginHorizontal: SPACING.md, marginTop: 12, marginBottom: 4,
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: GUARD_COLORS.accentLight,
    borderColor: GUARD_COLORS.accent + '60',
  },
  tabBtnText: { fontSize: 13, fontFamily: 'DMSans-SemiBold', fontWeight: '600', color: COLORS.textMuted },
  tabBtnTextActive: { color: GUARD_COLORS.accent },
  tabBadge: {
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full, paddingHorizontal: 5, paddingVertical: 1,
    minWidth: 18, alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: GUARD_COLORS.accent },
  tabBadgeText: { fontSize: 10, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.textMuted },
  tabBadgeTextActive: { color: '#fff' },

  packageList: { marginHorizontal: SPACING.md, marginTop: 10, gap: 10 },

  pkgCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    ...SHADOWS.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pkgHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pkgIconWrap: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  pkgInfo: { flex: 1 },
  pkgInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pkgFlat: { fontSize: 15, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text },
  pkgSep: { color: COLORS.textMuted },
  courierBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
  courierText: { fontSize: 11, fontFamily: 'DMSans-Bold', fontWeight: '700' },
  pkgResident: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', marginTop: 1 },
  pkgShelf: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },
  pkgRight: { alignItems: 'flex-end', gap: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  statusPillText: { fontSize: 11, fontFamily: 'DMSans-Bold', fontWeight: '700' },
  pkgTime: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  trackingNum: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 4, marginLeft: 46 },

  pkgExpanded: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  pkgDetailGrid: { gap: 8, marginBottom: 12 },
  pkgDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pkgDetailLabel: { width: 90, fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  pkgDetailVal: { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-SemiBold', fontWeight: '600' },

  pkgActions: { flexDirection: 'row', gap: 8 },
  pkgActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 38, borderRadius: RADIUS.md, ...SHADOWS.sm,
  },
  pkgActionBtnBlue: { backgroundColor: '#2563EB' },
  pkgActionBtnGreen: { backgroundColor: '#059669' },
  pkgActionBtnText: { color: '#fff', fontSize: 13, fontFamily: 'DMSans-SemiBold', fontWeight: '600' },

  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  emptyWrap: { paddingTop: 52, paddingHorizontal: 32, alignItems: 'center', gap: 10 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: RADIUS.xl,
    backgroundColor: GUARD_COLORS.accentLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', textAlign: 'center', lineHeight: 19 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: RADIUS.full, backgroundColor: GUARD_COLORS.accent,
    ...SHADOWS.sm,
  },
  emptyAddBtnText: { color: '#fff', fontFamily: 'DMSans-SemiBold', fontWeight: '600', fontSize: 14 },

  // ── Modal ──
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
    ...SHADOWS.lg,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  modalTitle: { fontSize: 17, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text },
  modalFields: { gap: 14, paddingBottom: 8 },

  otpPkgInfo: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  otpPkgFlat: { fontSize: 15, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text },
  otpPkgSub: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },
  otpInput: {
    fontSize: 22, fontFamily: 'DMSans-Bold', fontWeight: '700',
    textAlign: 'center', letterSpacing: 6, height: 58,
  },
  otpError: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 10, borderRadius: RADIUS.md,
    backgroundColor: '#FEF2F2', marginTop: 8,
  },
  otpErrorText: { flex: 1, fontSize: 13, color: '#DC2626', fontFamily: 'DMSans-Regular' },

  field: {},
  fieldLabel: { fontSize: 12, fontFamily: 'DMSans-SemiBold', fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  fieldInput: {
    height: 46, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 12, fontSize: 14,
    fontFamily: 'DMSans-Regular', color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  courierPicker: { gap: 8, paddingVertical: 2 },
  courierChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  courierChipActive: { backgroundColor: GUARD_COLORS.accentLight, borderColor: GUARD_COLORS.accent + '60' },
  courierChipText: { fontSize: 12, fontFamily: 'DMSans-SemiBold', fontWeight: '600', color: COLORS.textMuted },
  courierChipTextActive: { color: GUARD_COLORS.accent },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontFamily: 'DMSans-SemiBold', fontWeight: '600', color: COLORS.textSecondary },
  submitBtn: {
    flex: 2, height: 46, borderRadius: RADIUS.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GUARD_COLORS.accent, ...SHADOWS.sm,
  },
  submitBtnGreen: { backgroundColor: '#059669' },
  submitBtnText: { color: '#fff', fontFamily: 'DMSans-Bold', fontWeight: '700', fontSize: 14 },
});
