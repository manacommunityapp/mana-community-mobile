import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { foodService, PantryItemDto } from '@/services/foodService';

type TabKey = 'inventory' | 'expiring' | 'shopping';

export default function PantryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'kg', expiryDate: '' });

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/food');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showAddModal) { setShowAddModal(false); return true; }
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack, showAddModal])
  );

  const {
    data: pantryItems = [],
    isLoading,
    refetch,
  } = useQuery<PantryItemDto[]>({
    queryKey: ['food', 'pantry'],
    queryFn: () => foodService.getPantryItems(),
    staleTime: 30_000,
  });

  const addItemMutation = useMutation({
    mutationFn: (item: { name: string; quantity: number; unit: string; expiryDate?: string }) =>
      foodService.addPantryItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food', 'pantry'] });
      setShowAddModal(false);
      setNewItem({ name: '', quantity: '', unit: 'kg', expiryDate: '' });
      Alert.alert('Added!', 'Item added to your pantry.');
    },
    onError: () => Alert.alert('Error', 'Could not add item.'),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => foodService.removePantryItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food', 'pantry'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const now = new Date();
  const expiringItems = useMemo(() => {
    return pantryItems.filter((item) => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
      return daysLeft >= 0 && daysLeft <= 7;
    });
  }, [pantryItems]);

  const lowStockItems = useMemo(() => {
    return pantryItems.filter((item) => item.isLowStock);
  }, [pantryItems]);

  const filteredItems = useMemo(() => {
    const source = activeTab === 'expiring' ? expiringItems : activeTab === 'shopping' ? lowStockItems : pantryItems;
    if (!searchQuery) return source;
    const q = searchQuery.toLowerCase();
    return source.filter((i) => i.name.toLowerCase().includes(q));
  }, [pantryItems, expiringItems, lowStockItems, activeTab, searchQuery]);

  const getDaysUntilExpiry = (date: string) => {
    const d = Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000);
    if (d < 0) return 'Expired';
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    return `${d} days`;
  };

  const getExpiryColor = (date: string) => {
    const d = Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000);
    if (d <= 0) return '#EF4444';
    if (d <= 3) return '#F59E0B';
    return '#059669';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Smart Pantry</Text>
          <Text style={styles.headerSub}>Kitchen inventory & expiry alerts</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerBtn}>
          <Ionicons name="add" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {/* Hero */}
        <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBanner}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadge}>
                <Ionicons name="alert-circle" size={12} color="#FEF3C7" />
                <Text style={styles.heroBadgeText}>SMART PANTRY</Text>
              </View>
              <Text style={styles.heroTitle}>Kitchen Inventory</Text>
              <Text style={styles.heroSubtitle}>Track stock levels, get expiry alerts & auto-generate shopping lists</Text>
            </View>
            <View style={styles.heroIconCircle}>
              <Ionicons name="nutrition" size={26} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{pantryItems.length}</Text>
              <Text style={styles.heroStatLabel}>Items Tracked</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCard}>
              <Text style={[styles.heroStatNumber, expiringItems.length > 0 && { color: '#FEE2E2' }]}>{expiringItems.length}</Text>
              <Text style={styles.heroStatLabel}>Expiring Soon</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{lowStockItems.length}</Text>
              <Text style={styles.heroStatLabel}>Low Stock</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput style={styles.searchInput} placeholder="Search pantry items..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={COLORS.textMuted} /></TouchableOpacity>}
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {([
            { key: 'inventory' as TabKey, icon: 'cube' as keyof typeof Ionicons.glyphMap, label: 'All Items' },
            { key: 'expiring' as TabKey, icon: 'warning' as keyof typeof Ionicons.glyphMap, label: `Expiring (${expiringItems.length})` },
            { key: 'shopping' as TabKey, icon: 'cart' as keyof typeof Ionicons.glyphMap, label: `Low Stock (${lowStockItems.length})` },
          ]).map((t) => (
            <TouchableOpacity key={t.key} style={[styles.tabItem, activeTab === t.key && styles.tabItemActive]} onPress={() => setActiveTab(t.key)} activeOpacity={0.7}>
              <Ionicons name={t.icon} size={14} color={activeTab === t.key ? '#D97706' : COLORS.textMuted} />
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]} numberOfLines={1}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && pantryItems.length === 0 && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading pantry...</Text>
          </View>
        )}

        {/* Items List */}
        <View style={{ gap: SPACING.sm }}>
          {filteredItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name={activeTab === 'expiring' ? 'checkmark-circle-outline' : 'nutrition-outline'} size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'expiring' ? 'Nothing Expiring Soon' : activeTab === 'shopping' ? 'All Stocked Up' : 'No Items Yet'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'inventory' ? 'Tap + to add your first pantry item.' : 'Great! Your kitchen is well managed.'}
              </Text>
            </View>
          ) : (
            filteredItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={[styles.itemIcon, item.isLowStock && { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="nutrition" size={18} color={item.isLowStock ? '#D97706' : COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.isLowStock && <View style={styles.lowTag}><Text style={styles.lowTagText}>Low</Text></View>}
                  </View>
                  <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                  {item.expiryDate && (
                    <Text style={[styles.expiryText, { color: getExpiryColor(item.expiryDate) }]}>
                      Expires: {getDaysUntilExpiry(item.expiryDate)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Remove Item', `Remove ${item.name} from pantry?`, [
                      { text: 'Keep' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeItemMutation.mutate(item.id) },
                    ]);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Pantry Item</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: SPACING.md }}>
              <View>
                <Text style={styles.inputLabel}>Item Name</Text>
                <TextInput style={styles.input} placeholder="e.g. Basmati Rice" placeholderTextColor={COLORS.textMuted} value={newItem.name} onChangeText={(t) => setNewItem((p) => ({ ...p, name: t }))} />
              </View>
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput style={styles.input} placeholder="e.g. 5" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={newItem.quantity} onChangeText={(t) => setNewItem((p) => ({ ...p, quantity: t }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <View style={styles.unitRow}>
                    {['kg', 'L', 'pcs', 'pkt'].map((u) => (
                      <TouchableOpacity key={u} style={[styles.unitBtn, newItem.unit === u && styles.unitBtnActive]} onPress={() => setNewItem((p) => ({ ...p, unit: u }))}>
                        <Text style={[styles.unitBtnText, newItem.unit === u && styles.unitBtnTextActive]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <View>
                <Text style={styles.inputLabel}>Expiry Date (optional)</Text>
                <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={newItem.expiryDate} onChangeText={(t) => setNewItem((p) => ({ ...p, expiryDate: t }))} />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)} disabled={addItemMutation.isPending}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, (!newItem.name || !newItem.quantity || addItemMutation.isPending) && { opacity: 0.6 }]}
                  onPress={() => {
                    if (!newItem.name || !newItem.quantity) { Alert.alert('Missing Info', 'Name and quantity are required.'); return; }
                    addItemMutation.mutate({ name: newItem.name, quantity: parseFloat(newItem.quantity), unit: newItem.unit, expiryDate: newItem.expiryDate || undefined });
                  }}
                  disabled={!newItem.name || !newItem.quantity || addItemMutation.isPending}
                >
                  {addItemMutation.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalConfirmText}>Add to Pantry</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99, 102, 241, 0.12)' },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },
  centerContainer: { padding: SPACING.xl, alignItems: 'center' },
  loadingText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  heroBanner: { borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.md },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginBottom: 6 },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#FEF3C7', fontFamily: 'Outfit-Bold', letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  heroSubtitle: { fontSize: 12, color: '#FFFBEB', marginTop: 2, lineHeight: 17, fontFamily: 'DMSans-Regular' },
  heroIconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.lg, paddingVertical: SPACING.sm, marginTop: SPACING.md },
  heroStatCard: { alignItems: 'center' },
  heroStatNumber: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  heroStatLabel: { fontSize: 10, color: '#FFFBEB', marginTop: 1, fontFamily: 'DMSans-Medium' },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.25)' },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)', gap: 8, marginBottom: SPACING.sm, ...SHADOWS.sm },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular' },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4, marginBottom: SPACING.md, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.12)', gap: 2 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: RADIUS.md, gap: 3 },
  tabItemActive: { backgroundColor: '#FEF3C7' },
  tabText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: '#D97706', fontWeight: '800', fontFamily: 'Outfit-Bold' },

  emptyCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 4 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular' },

  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.12)', gap: SPACING.sm, ...SHADOWS.sm },
  itemIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  lowTag: { backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  lowTagText: { fontSize: 8, fontWeight: '800', color: '#D97706', fontFamily: 'Outfit-Bold' },
  itemQty: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', marginTop: 1 },
  expiryText: { fontSize: 11, fontWeight: '600', fontFamily: 'DMSans-Medium', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium', marginBottom: 4 },
  input: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)' },
  unitRow: { flexDirection: 'row', gap: 4 },
  unitBtn: { flex: 1, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: '#F8FAFC', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)' },
  unitBtnActive: { backgroundColor: '#FEF3C7', borderColor: '#D97706' },
  unitBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  unitBtnTextActive: { color: '#D97706', fontWeight: '800', fontFamily: 'Outfit-Bold' },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  modalCancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  modalConfirmBtn: { flex: 1.6, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#D97706', alignItems: 'center', ...SHADOWS.sm },
  modalConfirmText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
