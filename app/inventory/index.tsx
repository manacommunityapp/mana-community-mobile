import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  BackHandler,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  inventoryService,
  InventoryItem,
  PurchaseRequest,
  AssetAuditLog,
  ItemStatus,
  ProcurementStatus,
  ExpenseCategory,
} from '@/services/inventoryService';

type TabKey = 'assets' | 'procurement' | 'audit';
type AssetCategory = 'ALL' | 'Electronics' | 'Furniture' | 'Sports' | 'Tools' | 'DG Set' | 'Gym Equipment' | 'Other';

const ASSET_CATEGORIES: { value: AssetCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'ALL',           label: 'All Assets',     icon: 'grid-outline' },
  { value: 'Electronics',   label: 'Electronics',    icon: 'laptop-outline' },
  { value: 'Furniture',     label: 'Furniture',      icon: 'bed-outline' },
  { value: 'Sports',        label: 'Sports',         icon: 'football-outline' },
  { value: 'Tools',         label: 'Tools',          icon: 'hammer-outline' },
  { value: 'DG Set',        label: 'DG Sets',        icon: 'flash-outline' },
  { value: 'Gym Equipment', label: 'Gym Gear',       icon: 'barbell-outline' },
];

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  AVAILABLE:   { label: 'Available',   color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle' },
  BORROWED:    { label: 'Borrowed',    color: '#D97706', bg: '#FEF3C7', icon: 'arrow-redo' },
  MAINTENANCE: { label: 'Maintenance', color: '#2563EB', bg: '#DBEAFE', icon: 'construct' },
  LOST:        { label: 'Lost',        color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle' },
  DISPOSED:    { label: 'Disposed',    color: '#6B7280', bg: '#F3F4F6', icon: 'trash' },
};

const PROCUREMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  REQUESTED:           { label: 'Requested',     color: '#7C3AED', bg: '#EDE9FE' },
  COMMITTEE_APPROVED:  { label: 'Approved',      color: '#059669', bg: '#D1FAE5' },
  QUOTATIONS_COLLECTED:{ label: 'Quotes In',     color: '#2563EB', bg: '#DBEAFE' },
  VENDOR_SELECTED:     { label: 'Vendor Picked', color: '#0891B2', bg: '#CFFAFE' },
  PURCHASE_ORDERED:    { label: 'PO Raised',     color: '#D97706', bg: '#FEF3C7' },
  GOODS_RECEIVED:      { label: 'Received',      color: '#059669', bg: '#D1FAE5' },
  INVOICED:            { label: 'Invoiced',       color: '#4F46E5', bg: '#EEF2FF' },
  INVENTORY_CREATED:   { label: 'Inventoried',   color: '#059669', bg: '#D1FAE5' },
  REJECTED:            { label: 'Rejected',       color: '#DC2626', bg: '#FEE2E2' },
  CANCELLED:           { label: 'Cancelled',      color: '#6B7280', bg: '#F3F4F6' },
};

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'CapEx_Asset',       label: 'Capital Asset' },
  { value: 'OpEx_Consumable',   label: 'Consumable' },
  { value: 'OpEx_Maintenance',  label: 'Maintenance' },
  { value: 'OpEx_Other',        label: 'Other OpEx' },
  { value: 'SPORTS',            label: 'Sports' },
  { value: 'CLEANING',          label: 'Cleaning' },
  { value: 'SECURITY',          label: 'Security' },
  { value: 'GARDENING',         label: 'Gardening' },
  { value: 'STATIONERY',        label: 'Stationery' },
  { value: 'OFFICE',            label: 'Office' },
  { value: 'MISCELLANEOUS',     label: 'Miscellaneous' },
];

export default function InventoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('assets');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Purchase Request Modal
  const [showPRModal, setShowPRModal] = useState(false);
  const [prTitle, setPrTitle] = useState('');
  const [prDescription, setPrDescription] = useState('');
  const [prCategory, setPrCategory] = useState<ExpenseCategory>('CapEx_Asset');
  const [prAmount, setPrAmount] = useState('');
  const [prNeededBy, setPrNeededBy] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showPRModal) { setShowPRModal(false); return true; }
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome, showPRModal])
  );

  // ── Data Fetching ─────────────────────────────────────────────
  const {
    data: assets = [],
    isLoading: loadingAssets,
    refetch: refetchAssets,
  } = useQuery<InventoryItem[]>({
    queryKey: ['inventory', 'items'],
    queryFn: () => inventoryService.getItems(),
    staleTime: 30_000,
  });

  const {
    data: purchaseRequests = [],
    isLoading: loadingPR,
    refetch: refetchPR,
  } = useQuery<PurchaseRequest[]>({
    queryKey: ['inventory', 'procurement'],
    queryFn: () => inventoryService.getPurchaseRequests(),
    staleTime: 30_000,
  });

  const {
    data: auditLogs = [],
    isLoading: loadingAudit,
    refetch: refetchAudit,
  } = useQuery<AssetAuditLog[]>({
    queryKey: ['inventory', 'audit'],
    queryFn: () => inventoryService.getAuditLogs(),
    staleTime: 30_000,
  });

  const createPRMutation = useMutation({
    mutationFn: (data: Parameters<typeof inventoryService.createPurchaseRequest>[0]) =>
      inventoryService.createPurchaseRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'procurement'] });
      setShowPRModal(false);
      resetPRForm();
      Alert.alert('Request Submitted', 'Your purchase request has been submitted for approval.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not submit purchase request.');
    },
  });

  const resetPRForm = () => {
    setPrTitle('');
    setPrDescription('');
    setPrCategory('CapEx_Asset');
    setPrAmount('');
    setPrNeededBy('');
  };

  const handleSubmitPR = () => {
    if (!prTitle.trim()) { Alert.alert('Required', 'Please enter a title.'); return; }
    const amount = parseFloat(prAmount);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Required', 'Please enter a valid amount.'); return; }
    createPRMutation.mutate({
      title: prTitle.trim(),
      description: prDescription.trim() || undefined,
      category: prCategory,
      estimatedAmount: amount,
      neededBy: prNeededBy.trim() || undefined,
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refetchAssets(), refetchPR(), refetchAudit()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchAssets, refetchPR, refetchAudit]);

  // ── Filtering ─────────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    let list = assets;
    if (categoryFilter !== 'ALL') {
      list = list.filter((a) => {
        const cat = (a.category || '').toLowerCase();
        return cat.includes(categoryFilter.toLowerCase());
      });
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.serialNumber || '').toLowerCase().includes(q) ||
          (a.location || '').toLowerCase().includes(q) ||
          (a.qrCodeId || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [assets, categoryFilter, statusFilter, searchQuery]);

  // ── Summary Stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = assets.length;
    const available = assets.filter((a) => a.status === 'AVAILABLE').length;
    const borrowed = assets.filter((a) => a.status === 'BORROWED').length;
    const maintenance = assets.filter((a) => a.status === 'MAINTENANCE').length;
    return { total, available, borrowed, maintenance };
  }, [assets]);

  const prStats = useMemo(() => {
    const total = purchaseRequests.length;
    const pending = purchaseRequests.filter((p) =>
      p.status === 'REQUESTED' || p.status === 'COMMITTEE_APPROVED'
    ).length;
    const ordered = purchaseRequests.filter((p) => p.status === 'PURCHASE_ORDERED').length;
    return { total, pending, ordered };
  }, [purchaseRequests]);

  const isLoading = (activeTab === 'assets' && loadingAssets) ||
    (activeTab === 'procurement' && loadingPR) ||
    (activeTab === 'audit' && loadingAudit);
  const isInitialLoading = isLoading && !refreshing;

  // ── Render Helpers ────────────────────────────────────────────
  const renderStatusBadge = (status: ItemStatus) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.AVAILABLE;
    return (
      <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={11} color={cfg.color} />
        <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    );
  };

  const renderAssetCard = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/inventory/${item.id}`)}
    >
      <View style={s.cardHeader}>
        <View style={s.cardIconBox}>
          <Ionicons
            name={
              (item.category || '').toLowerCase().includes('electro') ? 'laptop-outline' :
              (item.category || '').toLowerCase().includes('gym') ? 'barbell-outline' :
              (item.category || '').toLowerCase().includes('sport') ? 'football-outline' :
              (item.category || '').toLowerCase().includes('tool') ? 'hammer-outline' :
              (item.category || '').toLowerCase().includes('dg') ? 'flash-outline' :
              (item.category || '').toLowerCase().includes('furniture') ? 'bed-outline' :
              'cube-outline'
            }
            size={22}
            color={COLORS.primary}
          />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={s.cardMetaRow}>
            {item.serialNumber && (
              <>
                <Ionicons name="barcode-outline" size={11} color={COLORS.textMuted} />
                <Text style={s.cardMetaText}>{item.serialNumber}</Text>
              </>
            )}
            {item.location && (
              <>
                <Ionicons name="location-outline" size={11} color={COLORS.textMuted} style={{ marginLeft: item.serialNumber ? 8 : 0 }} />
                <Text style={s.cardMetaText}>{item.location}</Text>
              </>
            )}
          </View>
        </View>
        {renderStatusBadge(item.status)}
      </View>

      <View style={s.cardInfoRow}>
        {item.category && (
          <View style={s.infoPill}>
            <Ionicons name="pricetag-outline" size={10} color={COLORS.textSecondary} />
            <Text style={s.infoPillText}>{item.category}</Text>
          </View>
        )}
        {item.qrCodeId && (
          <View style={s.infoPill}>
            <Ionicons name="qr-code-outline" size={10} color={COLORS.textSecondary} />
            <Text style={s.infoPillText}>QR</Text>
          </View>
        )}
        {item.originalCost != null && item.originalCost > 0 && (
          <View style={s.infoPill}>
            <Text style={s.infoPillText}>
              {'₹'}{item.originalCost.toLocaleString('en-IN')}
            </Text>
          </View>
        )}
      </View>

      {item.status === 'BORROWED' && item.borrowedBy && (
        <View style={s.borrowedBar}>
          <Ionicons name="person-outline" size={12} color="#D97706" />
          <Text style={s.borrowedText}>
            Checked out to {item.borrowedBy}
            {item.borrowedByFlat ? ` (${item.borrowedByFlat})` : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPRCard = ({ item }: { item: PurchaseRequest }) => {
    const cfg = PROCUREMENT_STATUS_CONFIG[item.status || 'REQUESTED'] || PROCUREMENT_STATUS_CONFIG.REQUESTED;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.cardIconBox, { backgroundColor: cfg.bg }]}>
            <Ionicons name="cart-outline" size={22} color={cfg.color} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.cardName} numberOfLines={1}>{item.title}</Text>
            <Text style={s.cardMetaText} numberOfLines={1}>
              {EXPENSE_CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
            </Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={s.prDetailsRow}>
          <View style={s.prDetailItem}>
            <Text style={s.prDetailLabel}>Estimated</Text>
            <Text style={s.prDetailValue}>{'₹'}{(item.estimatedAmount || 0).toLocaleString('en-IN')}</Text>
          </View>
          {item.neededBy && (
            <View style={s.prDetailItem}>
              <Text style={s.prDetailLabel}>Needed By</Text>
              <Text style={s.prDetailValue}>{item.neededBy}</Text>
            </View>
          )}
          {item.purchaseOrderNumber && (
            <View style={s.prDetailItem}>
              <Text style={s.prDetailLabel}>PO #</Text>
              <Text style={s.prDetailValue}>{item.purchaseOrderNumber}</Text>
            </View>
          )}
        </View>

        {item.description && (
          <Text style={s.prDescription} numberOfLines={2}>{item.description}</Text>
        )}

        {item.createdAt && (
          <Text style={s.timestampText}>
            Requested {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        )}
      </View>
    );
  };

  const renderAuditCard = ({ item }: { item: AssetAuditLog }) => {
    const hasVariance = item.variance !== 0;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.cardIconBox, { backgroundColor: hasVariance ? '#FEE2E2' : '#D1FAE5' }]}>
            <Ionicons
              name={hasVariance ? 'warning-outline' : 'shield-checkmark-outline'}
              size={22}
              color={hasVariance ? '#DC2626' : '#059669'}
            />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.cardName} numberOfLines={1}>
              {item.asset?.name || `Asset #${item.id}`}
            </Text>
            <Text style={s.cardMetaText}>
              Audited by {item.auditedBy}
            </Text>
          </View>
          {hasVariance ? (
            <View style={[s.statusBadge, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={11} color="#DC2626" />
              <Text style={[s.statusBadgeText, { color: '#DC2626' }]}>Variance</Text>
            </View>
          ) : (
            <View style={[s.statusBadge, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={11} color="#059669" />
              <Text style={[s.statusBadgeText, { color: '#059669' }]}>Matched</Text>
            </View>
          )}
        </View>

        <View style={s.auditStatsRow}>
          <View style={s.auditStatBox}>
            <Text style={s.auditStatLabel}>Expected</Text>
            <Text style={s.auditStatValue}>{item.expectedQuantity}</Text>
          </View>
          <View style={s.auditStatBox}>
            <Text style={s.auditStatLabel}>Actual</Text>
            <Text style={s.auditStatValue}>{item.actualQuantity}</Text>
          </View>
          <View style={s.auditStatBox}>
            <Text style={s.auditStatLabel}>Variance</Text>
            <Text style={[s.auditStatValue, { color: hasVariance ? '#DC2626' : '#059669' }]}>
              {item.variance > 0 ? '+' : ''}{item.variance}
            </Text>
          </View>
        </View>

        {item.notes && (
          <Text style={s.prDescription} numberOfLines={2}>{item.notes}</Text>
        )}

        <Text style={s.timestampText}>
          {new Date(item.auditedAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Inventory & Procurement</Text>
          <Text style={s.headerSub}>Society assets, purchases & audit</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowPRModal(true)}
          style={s.headerActionBtn}
        >
          <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabBar}>
        {([
          { key: 'assets' as TabKey, label: 'Assets', icon: 'cube' as const, count: stats.total },
          { key: 'procurement' as TabKey, label: 'Procurement', icon: 'cart' as const, count: prStats.total },
          { key: 'audit' as TabKey, label: 'Audit', icon: 'shield-checkmark' as const, count: auditLogs.length },
        ]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={15}
              color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Assets Tab: Summary + Filters ── */}
      {activeTab === 'assets' && (
        <>
          {/* Summary Bar */}
          <View style={s.summaryBar}>
            {[
              { label: 'Total', value: stats.total, color: COLORS.primary },
              { label: 'Available', value: stats.available, color: '#059669' },
              { label: 'Borrowed', value: stats.borrowed, color: '#D97706' },
              { label: 'Maintenance', value: stats.maintenance, color: '#2563EB' },
            ].map((st) => (
              <View key={st.label} style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: st.color }]}>{st.value}</Text>
                <Text style={s.summaryLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Search */}
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="Search assets by name, serial, location..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Chips */}
          <View style={s.categoryBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.categoryScroll}
            >
              {ASSET_CATEGORIES.map((c) => {
                const active = categoryFilter === c.value;
                return (
                  <TouchableOpacity
                    key={c.value}
                    style={[s.categoryChip, active && s.categoryChipActive]}
                    onPress={() => setCategoryFilter(c.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={c.icon} size={13} color={active ? '#FFFFFF' : COLORS.textSecondary} />
                    <Text style={[s.categoryChipText, active && s.categoryChipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Status Filter Pills */}
          <View style={s.statusFilterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 6 }}>
              <TouchableOpacity
                style={[s.statusPill, statusFilter === 'ALL' && s.statusPillActive]}
                onPress={() => setStatusFilter('ALL')}
              >
                <Text style={[s.statusPillText, statusFilter === 'ALL' && s.statusPillTextActive]}>All</Text>
              </TouchableOpacity>
              {(Object.keys(STATUS_CONFIG) as ItemStatus[]).map((st) => {
                const cfg = STATUS_CONFIG[st];
                const active = statusFilter === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[s.statusPill, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                    onPress={() => setStatusFilter(st)}
                  >
                    <Ionicons name={cfg.icon} size={11} color={active ? cfg.color : COLORS.textMuted} />
                    <Text style={[s.statusPillText, active && { color: cfg.color }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}

      {/* ── Procurement Tab: Summary ── */}
      {activeTab === 'procurement' && (
        <View style={s.summaryBar}>
          {[
            { label: 'Total', value: prStats.total, color: COLORS.primary },
            { label: 'Pending', value: prStats.pending, color: '#7C3AED' },
            { label: 'Ordered', value: prStats.ordered, color: '#D97706' },
          ].map((st) => (
            <View key={st.label} style={s.summaryItem}>
              <Text style={[s.summaryValue, { color: st.color }]}>{st.value}</Text>
              <Text style={s.summaryLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Loading ── */}
      {isInitialLoading && (
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>
            Loading {activeTab === 'assets' ? 'assets' : activeTab === 'procurement' ? 'purchase requests' : 'audit logs'}...
          </Text>
        </View>
      )}

      {/* ── Assets List ── */}
      {activeTab === 'assets' && !isInitialLoading && (
        <FlatList
          data={filteredAssets}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAssetCard}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No assets found</Text>
              <Text style={s.emptySub}>
                {searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'Try adjusting your filters or search query.'
                  : 'Society assets will appear here once added by admin.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Procurement List ── */}
      {activeTab === 'procurement' && !isInitialLoading && (
        <FlatList
          data={purchaseRequests}
          keyExtractor={(item) => String(item.id || Math.random())}
          renderItem={renderPRCard}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="cart-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No purchase requests</Text>
              <Text style={s.emptySub}>Tap + to create a new procurement request.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowPRModal(true)}>
                <Text style={s.emptyBtnText}>New Request</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── Audit List ── */}
      {activeTab === 'audit' && !isInitialLoading && (
        <FlatList
          data={auditLogs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAuditCard}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No audit records</Text>
              <Text style={s.emptySub}>Physical asset audits will appear here once conducted.</Text>
            </View>
          }
        />
      )}

      {/* ── Create Purchase Request Modal ── */}
      <Modal visible={showPRModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Purchase Request</Text>
              <TouchableOpacity
                onPress={() => { setShowPRModal(false); resetPRForm(); }}
                disabled={createPRMutation.isPending}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Title */}
              <Text style={s.fieldLabel}>Title *</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="e.g. Replace broken gym bench"
                placeholderTextColor={COLORS.textMuted}
                value={prTitle}
                onChangeText={setPrTitle}
              />

              {/* Category */}
              <Text style={s.fieldLabel}>Category *</Text>
              <TouchableOpacity
                style={s.fieldSelect}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Text style={s.fieldSelectText}>
                  {EXPENSE_CATEGORIES.find((c) => c.value === prCategory)?.label || prCategory}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={s.pickerDropdown}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c.value}
                      style={[s.pickerOption, prCategory === c.value && s.pickerOptionActive]}
                      onPress={() => { setPrCategory(c.value); setShowCategoryPicker(false); }}
                    >
                      <Text style={[s.pickerOptionText, prCategory === c.value && { color: COLORS.primary, fontWeight: '700' }]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Amount */}
              <Text style={s.fieldLabel}>Estimated Amount ({'₹'}) *</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="25000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={prAmount}
                onChangeText={setPrAmount}
              />

              {/* Description */}
              <Text style={s.fieldLabel}>Description</Text>
              <TextInput
                style={[s.fieldInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Provide details about the purchase..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                value={prDescription}
                onChangeText={setPrDescription}
              />

              {/* Needed By */}
              <Text style={s.fieldLabel}>Needed By (Date)</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={prNeededBy}
                onChangeText={setPrNeededBy}
              />
            </ScrollView>

            <View style={s.modalActionRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowPRModal(false); resetPRForm(); }}
                disabled={createPRMutation.isPending}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, createPRMutation.isPending && { opacity: 0.6 }]}
                disabled={createPRMutation.isPending}
                onPress={handleSubmitPR}
              >
                {createPRMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  headerActionBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
    gap: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
    gap: 4,
  },
  tabItemActive: { backgroundColor: '#EEF2FF' },
  tabText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: COLORS.primary, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  // Summary
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
    gap: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    paddingVertical: 6,
  },
  summaryValue: { fontSize: 18, fontWeight: '900', fontFamily: 'Outfit-Bold' },
  summaryLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'DMSans-Regular',
    padding: 0,
  },

  // Categories
  categoryBar: {
    backgroundColor: 'transparent',
    marginTop: SPACING.xs,
  },
  categoryScroll: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, gap: 6 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium', fontWeight: '600' },
  categoryChipTextActive: { color: '#FFFFFF', fontFamily: 'Outfit-Bold', fontWeight: '700' },

  // Status filter
  statusFilterRow: {
    marginTop: 2,
    paddingVertical: SPACING.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusPillActive: { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  statusPillText: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  statusPillTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Cards
  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardIconBox: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  cardMetaText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  cardInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  infoPillText: { fontSize: 10, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 9, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  borrowedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  borrowedText: { fontSize: 11, color: '#92400E', fontFamily: 'DMSans-Medium' },

  // PR details
  prDetailsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  prDetailItem: { flex: 1 },
  prDetailLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  prDetailValue: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 1 },
  prDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'DMSans-Regular',
    marginTop: SPACING.sm,
    lineHeight: 16,
  },
  timestampText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: 'DMSans-Regular',
    marginTop: SPACING.xs,
  },

  // Audit stats
  auditStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  auditStatBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    paddingVertical: 6,
  },
  auditStatLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  auditStatValue: { fontSize: 16, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold' },

  // Empty
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: SPACING.xs },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 8 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular', paddingHorizontal: 30 },
  emptyBtn: {
    marginTop: SPACING.md,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  emptyBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  // Loading
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  // Modal
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
  modalCloseBtn: { padding: 4 },

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
  fieldSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  fieldSelectText: { fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular' },

  pickerDropdown: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    maxHeight: 180,
  },
  pickerOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerOptionActive: { backgroundColor: '#EEF2FF' },
  pickerOptionText: { fontSize: 12, color: COLORS.text, fontFamily: 'DMSans-Regular' },

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
