import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { ProcurementCategory } from '@/types/procurement';

const CATEGORIES: { value: ProcurementCategory; label: string; emoji: string }[] = [
  { value: 'CLEANING_SUPPLIES', label: 'Cleaning',     emoji: '🧹' },
  { value: 'ELECTRICAL',        label: 'Electrical',   emoji: '⚡' },
  { value: 'PLUMBING',          label: 'Plumbing',     emoji: '🔧' },
  { value: 'OFFICE_SUPPLIES',   label: 'Office',       emoji: '📎' },
  { value: 'GARDENING',         label: 'Gardening',    emoji: '🌿' },
  { value: 'SECURITY_EQUIPMENT',label: 'Security',     emoji: '🔒' },
  { value: 'FURNITURE',         label: 'Furniture',    emoji: '🪑' },
  { value: 'IT_EQUIPMENT',      label: 'IT / Tech',    emoji: '💻' },
  { value: 'FOOD_BEVERAGE',     label: 'Food & Bev',   emoji: '🍱' },
  { value: 'MAINTENANCE',       label: 'Maintenance',  emoji: '🏢' },
  { value: 'PACKAGING',         label: 'Packaging',    emoji: '📦' },
  { value: 'OTHER',             label: 'Other',        emoji: '📦' },
];

const UNITS = ['units', 'kg', 'litres', 'packets', 'boxes', 'pieces', 'rolls', 'pairs', 'sets'];

const DATE_30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const DATE_45 = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);

interface Tier { minQty: string; price: string }

export default function NewBulkBuyCampaign() {
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProcurementCategory>('CLEANING_SUPPLIES');
  const [unit, setUnit] = useState('units');
  const [customUnit, setCustomUnit] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [minOrderQty, setMinOrderQty] = useState('100');
  const [targetQty, setTargetQty] = useState('');
  const [deadlineDate, setDeadlineDate] = useState(DATE_30);
  const [deliveryDate, setDeliveryDate] = useState(DATE_45);
  const [tiers, setTiers] = useState<Tier[]>([{ minQty: '100', price: '' }]);
  const [activateNow, setActivateNow] = useState(true);

  const createMut = useMutation({
    mutationFn: async () => {
      const parsedTiers = tiers
        .filter(t => t.minQty && t.price)
        .map(t => ({ minQuantity: parseInt(t.minQty, 10), pricePerUnit: parseFloat(t.price) }));

      if (!parsedTiers.length) throw new Error('Add at least one price tier');

      const result = await procurementHubService.createBulkBuyCampaign({
        title: title.trim() || `${productName} BulkBuy`,
        description: description.trim() || undefined,
        productName: productName.trim(),
        category,
        unit: customUnit.trim() || unit,
        minOrderQuantity: parseInt(minOrderQty, 10) || 100,
        targetQuantity: targetQty ? parseInt(targetQty, 10) : undefined,
        priceTiers: parsedTiers,
        retailPrice: retailPrice ? parseFloat(retailPrice) : undefined,
        deadlineDate,
        deliveryDate: deliveryDate || undefined,
      });

      if (activateNow) {
        await procurementHubService.activateBulkBuyCampaign(result.id);
      }

      return result;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['bulkbuy-campaigns'] });
      Alert.alert(
        'Campaign Created! 🎉',
        activateNow
          ? 'Your BulkBuy campaign is now live. Members can start committing.'
          : 'Campaign saved as draft. Activate it when ready.',
        [
          {
            text: 'View Campaign',
            onPress: () => {
              router.back();
              router.push(`/procurement/bulkbuy/${result.id}` as any);
            },
          },
          { text: 'Back to List', onPress: () => router.back() },
        ],
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to create campaign. Please try again.');
    },
  });

  function addTier() {
    if (tiers.length >= 4) return;
    setTiers(prev => [...prev, { minQty: '', price: '' }]);
  }

  function removeTier(i: number) {
    setTiers(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateTier(i: number, field: keyof Tier, val: string) {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }

  function validate() {
    if (!productName.trim()) { Alert.alert('Required', 'Enter a product name.'); return false; }
    const hasValidTier = tiers.some(t => t.minQty && t.price && parseFloat(t.price) > 0);
    if (!hasValidTier) { Alert.alert('Required', 'Add at least one price tier with quantity and price.'); return false; }
    if (!deadlineDate) { Alert.alert('Required', 'Set a commitment deadline.'); return false; }
    return true;
  }

  const currentUnit = customUnit.trim() || unit;
  const lowestTierPrice = tiers
    .filter(t => t.price)
    .map(t => parseFloat(t.price))
    .sort((a, b) => b - a)[0];
  const savings = retailPrice && lowestTierPrice
    ? Math.round(((parseFloat(retailPrice) - lowestTierPrice) / parseFloat(retailPrice)) * 100)
    : null;

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={s.content}>
        {/* Product Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Product Details</Text>

          <Field label="Product Name *">
            <TextInput
              style={s.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g. Floor Cleaning Liquid"
              placeholderTextColor={COLORS.textMuted}
            />
          </Field>

          <Field label="Campaign Title">
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder={`${productName || 'Product'} BulkBuy (auto-filled)`}
              placeholderTextColor={COLORS.textMuted}
            />
          </Field>

          <Field label="Description">
            <TextInput
              style={[s.input, { height: 72, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional details about specifications, brand, etc."
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
          </Field>

          <Field label="Category">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.chipRow}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.value}
                    style={[s.chip, category === c.value && s.chipActive]}
                    onPress={() => setCategory(c.value)}
                  >
                    <Text style={s.chipEmoji}>{c.emoji}</Text>
                    <Text style={[s.chipText, category === c.value && s.chipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Field>

          <Field label="Unit of Measurement">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.chipRow}>
                {UNITS.map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[s.unitChip, unit === u && !customUnit && s.chipActive]}
                    onPress={() => { setUnit(u); setCustomUnit(''); }}
                  >
                    <Text style={[s.unitChipText, unit === u && !customUnit && s.chipTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TextInput
              style={[s.input, { marginTop: 6 }]}
              value={customUnit}
              onChangeText={setCustomUnit}
              placeholder="Or type custom unit..."
              placeholderTextColor={COLORS.textMuted}
            />
          </Field>

          <Field label="Retail / MRP Price per unit (₹)">
            <TextInput
              style={s.input}
              value={retailPrice}
              onChangeText={setRetailPrice}
              placeholder="e.g. 500 (for savings display)"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
            />
          </Field>
        </View>

        {/* Price Tiers */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Price Tiers *</Text>
            {tiers.length < 4 && (
              <TouchableOpacity style={s.addTierBtn} onPress={addTier}>
                <Ionicons name="add" size={14} color="#2563EB" />
                <Text style={s.addTierText}>Add Tier</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={s.sectionSub}>
            Set price breakpoints — more units = lower price
          </Text>

          {tiers.map((tier, i) => (
            <View key={i} style={s.tierRow}>
              <View style={s.tierNum}>
                <Text style={s.tierNumText}>{i + 1}</Text>
              </View>
              <View style={s.tierInputs}>
                <View style={s.tierField}>
                  <Text style={s.tierLabel}>Min Qty</Text>
                  <TextInput
                    style={s.tierInput}
                    value={tier.minQty}
                    onChangeText={v => updateTier(i, 'minQty', v)}
                    keyboardType="number-pad"
                    placeholder="e.g. 100"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <Text style={s.tierArrow}>→</Text>
                <View style={s.tierField}>
                  <Text style={s.tierLabel}>Price (₹/{currentUnit})</Text>
                  <TextInput
                    style={s.tierInput}
                    value={tier.price}
                    onChangeText={v => updateTier(i, 'price', v)}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 450"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>
              {tiers.length > 1 && (
                <TouchableOpacity onPress={() => removeTier(i)} style={s.removeTier}>
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* Tier preview */}
          {tiers.some(t => t.minQty && t.price) && (
            <View style={s.tierPreview}>
              <Text style={s.tierPreviewTitle}>Preview</Text>
              {tiers
                .filter(t => t.minQty && t.price)
                .sort((a, b) => parseInt(a.minQty) - parseInt(b.minQty))
                .map((t, i) => {
                  const savPct = retailPrice
                    ? Math.round(((parseFloat(retailPrice) - parseFloat(t.price)) / parseFloat(retailPrice)) * 100)
                    : null;
                  return (
                    <View key={i} style={s.previewTierRow}>
                      <Text style={s.previewTierQty}>{t.minQty}+ {currentUnit}</Text>
                      <Text style={s.previewTierPrice}>₹{t.price}/{currentUnit}</Text>
                      {savPct != null && savPct > 0 && (
                        <Text style={s.previewTierSav}>{savPct}% off</Text>
                      )}
                    </View>
                  );
                })
              }
              {savings != null && savings > 0 && (
                <Text style={s.bestSavings}>🎯 Best saving: {savings}% off MRP</Text>
              )}
            </View>
          )}
        </View>

        {/* Thresholds */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Order Thresholds</Text>
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Field label={`Min Qty to confirm (${currentUnit}) *`}>
                <TextInput
                  style={s.input}
                  value={minOrderQty}
                  onChangeText={setMinOrderQty}
                  keyboardType="number-pad"
                  placeholder="100"
                  placeholderTextColor={COLORS.textMuted}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label={`Stretch target (${currentUnit})`}>
                <TextInput
                  style={s.input}
                  value={targetQty}
                  onChangeText={setTargetQty}
                  keyboardType="number-pad"
                  placeholder="Optional"
                  placeholderTextColor={COLORS.textMuted}
                />
              </Field>
            </View>
          </View>
          <Text style={s.fieldHint}>
            Campaign confirms only if commitments reach {minOrderQty || '?'} {currentUnit}
          </Text>
        </View>

        {/* Timeline */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Timeline</Text>
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Commitment Deadline *">
                <TextInput
                  style={s.input}
                  value={deadlineDate}
                  onChangeText={setDeadlineDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Expected Delivery">
                <TextInput
                  style={s.input}
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                />
              </Field>
            </View>
          </View>
        </View>

        {/* Activate option */}
        <View style={s.activateRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.activateLabel}>Activate immediately</Text>
            <Text style={s.activateSub}>Members can commit right away</Text>
          </View>
          <Switch
            value={activateNow}
            onValueChange={setActivateNow}
            trackColor={{ true: '#2563EB' }}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, createMut.isPending && { opacity: 0.6 }]}
          onPress={() => validate() && createMut.mutate()}
          disabled={createMut.isPending}
        >
          {createMut.isPending
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="rocket-outline" size={18} color="#fff" />
                <Text style={s.submitBtnText}>
                  {activateNow ? 'Launch Campaign' : 'Save as Draft'}
                </Text>
              </>
          }
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 12, gap: 12 },

  section: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm, gap: 10,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, marginTop: -4 },

  field: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151' },
  fieldHint: { fontSize: 11, color: COLORS.textMuted },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md,
    padding: 10, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC',
  },

  chipRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  chipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  chipTextActive: { color: '#2563EB' },
  unitChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  unitChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },

  addTierBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  addTierText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },

  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  tierNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tierInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tierField: { flex: 1, gap: 2 },
  tierLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  tierInput: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8,
    padding: 8, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC',
  },
  tierArrow: { fontSize: 14, color: COLORS.textMuted },
  removeTier: { padding: 4 },

  tierPreview: {
    backgroundColor: '#F0F9FF', borderRadius: 10, padding: 10, gap: 6,
  },
  tierPreviewTitle: { fontSize: 11, fontWeight: '700', color: '#1D4ED8', marginBottom: 2 },
  previewTierRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewTierQty: { flex: 1, fontSize: 12, fontWeight: '600', color: '#1E293B' },
  previewTierPrice: { fontSize: 12, fontWeight: '700', color: '#059669' },
  previewTierSav: { fontSize: 10, color: '#059669', backgroundColor: '#DCFCE7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  bestSavings: { fontSize: 12, fontWeight: '700', color: '#1D4ED8', marginTop: 2 },

  row2: { flexDirection: 'row', gap: 8 },

  activateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  activateLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  activateSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', borderRadius: RADIUS.lg, paddingVertical: 14,
    ...SHADOWS.md ?? SHADOWS.sm,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
