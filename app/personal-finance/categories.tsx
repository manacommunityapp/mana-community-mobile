import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  personalFinanceService,
  PersonalCategoryDto,
  CreateCategoryDto,
} from '@/services/personalFinanceService';

const AVAILABLE_COLORS = [
  '#F97316', '#3B82F6', '#8B5CF6', '#EF4444',
  '#EC4899', '#6366F1', '#10B981', '#0EA5E9', '#F59E0B', '#64748B',
];

const AVAILABLE_ICONS = [
  'restaurant-outline', 'car-outline', 'home-outline', 'medkit-outline',
  'bag-outline', 'film-outline', 'briefcase-outline', 'laptop-outline',
  'trending-up-outline', 'gift-outline', 'flash-outline', 'fitness-outline',
  'airplane-outline', 'school-outline', 'cart-outline', 'wallet-outline',
];

export default function CategoriesScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    icon: string;
    color: string;
    type: 'INCOME' | 'EXPENSE';
  }>({
    name: '',
    icon: AVAILABLE_ICONS[0],
    color: AVAILABLE_COLORS[0],
    type: 'EXPENSE',
  });

  const { data: categories = [], isLoading, refetch } = useQuery<PersonalCategoryDto[]>({
    queryKey: ['personal-finance-categories'],
    queryFn: personalFinanceService.getCategories,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateCategoryDto) => personalFinanceService.createCategory(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-categories'] });
      setShowModal(false);
      setForm({
        name: '',
        icon: AVAILABLE_ICONS[0],
        color: AVAILABLE_COLORS[0],
        type: activeTab,
      });
      Alert.alert('✅ Category Added', 'New category created successfully.');
    },
    onError: () => Alert.alert('Error', 'Could not create category.'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleCreate = () => {
    if (!form.name.trim()) return Alert.alert('Required', 'Enter a category name.');
    createMutation.mutate({
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      type: form.type,
    });
  };

  const filteredCategories = categories.filter(c => c.type === activeTab);

  if (isLoading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Type Tabs ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'EXPENSE' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('EXPENSE');
            setForm(f => ({ ...f, type: 'EXPENSE' }));
          }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'EXPENSE' && styles.tabBtnTextActive]}>
            Expense Categories
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'INCOME' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('INCOME');
            setForm(f => ({ ...f, type: 'INCOME' }));
          }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'INCOME' && styles.tabBtnTextActive]}>
            Income Categories
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Add Category Button ── */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          setForm(f => ({ ...f, type: activeTab }));
          setShowModal(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.addBtnText}>Add Custom Category</Text>
      </TouchableOpacity>

      {/* ── Category List ── */}
      <View style={{ gap: SPACING.md }}>
        {filteredCategories.map(cat => (
          <View key={cat.id} style={styles.catCard}>
            <View style={styles.catHeader}>
              <View style={[styles.catIconWrap, { backgroundColor: cat.color + '22' }]}>
                <Ionicons name={(cat.icon as any) || 'ellipse-outline'} size={22} color={cat.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catSubCount}>
                  {(cat.subcategories?.length ?? 0) > 0
                    ? `${cat.subcategories.length} subcategories`
                    : 'Main category'}
                </Text>
              </View>
              <View style={[styles.colorBadge, { backgroundColor: cat.color }]} />
            </View>

            {/* Subcategories */}
            {(cat.subcategories?.length ?? 0) > 0 && (
              <View style={styles.subCatGrid}>
                {cat.subcategories.map(sub => (
                  <View key={sub.id} style={styles.subCatChip}>
                    <Ionicons name={(sub.icon as any) || 'ellipse-outline'} size={12} color={COLORS.textSecondary} />
                    <Text style={styles.subCatText}>{sub.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      {/* ── Add Category Modal ── */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Category</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Category Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Subscriptions, Groceries, Gym"
                placeholderTextColor={COLORS.textMuted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={styles.fieldLabel}>Select Color</Text>
              <View style={styles.colorPalette}>
                {AVAILABLE_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }, form.color === c && styles.colorDotActive]}
                    onPress={() => setForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>Select Icon</Text>
              <View style={styles.iconGrid}>
                {AVAILABLE_ICONS.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconChoice, form.icon === ic && { backgroundColor: form.color + '22', borderColor: form.color }]}
                    onPress={() => setForm(f => ({ ...f, icon: ic }))}
                  >
                    <Ionicons name={ic as any} size={20} color={form.icon === ic ? form.color : COLORS.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, createMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Text style={styles.confirmBtnText}>Save Category</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabRow: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: RADIUS.lg, padding: 3, marginBottom: SPACING.md },
  tabBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.md },
  tabBtnActive: { backgroundColor: '#FFFFFF', ...SHADOWS.sm },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  tabBtnTextActive: { color: COLORS.text, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, paddingVertical: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', marginBottom: SPACING.md,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  catCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  catIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  catSubCount: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  colorBadge: { width: 14, height: 14, borderRadius: 7 },

  subCatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  subCatChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  subCatText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, maxHeight: '90%', ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'DMSans-Medium' },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: 14, color: COLORS.text, marginBottom: SPACING.md, fontFamily: 'DMSans-Regular',
  },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.md },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: COLORS.text },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  iconChoice: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F8FAFC' },

  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm, paddingBottom: SPACING.lg },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.sm },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
