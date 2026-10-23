import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { ProcurementCategory, CreateProductPayload } from '@/types/procurement';

const CATEGORIES: { value: ProcurementCategory; label: string; emoji: string }[] = [
  { value: 'CLEANING_SUPPLIES',   label: 'Cleaning Supplies',   emoji: '🧹' },
  { value: 'ELECTRICAL',          label: 'Electrical',          emoji: '⚡' },
  { value: 'PLUMBING',            label: 'Plumbing',            emoji: '🔧' },
  { value: 'OFFICE_SUPPLIES',     label: 'Office Supplies',     emoji: '📎' },
  { value: 'GARDENING',           label: 'Gardening',           emoji: '🌿' },
  { value: 'SECURITY_EQUIPMENT',  label: 'Security Equipment',  emoji: '🔒' },
  { value: 'FURNITURE',           label: 'Furniture',           emoji: '🪑' },
  { value: 'IT_EQUIPMENT',        label: 'IT Equipment',        emoji: '💻' },
  { value: 'FOOD_BEVERAGE',       label: 'Food & Beverage',     emoji: '🍽️' },
  { value: 'MAINTENANCE',         label: 'Maintenance',         emoji: '🔨' },
  { value: 'PACKAGING',           label: 'Packaging',           emoji: '📦' },
  { value: 'OTHER',               label: 'Other',               emoji: '🗂️' },
];

const UNITS = ['units', 'pieces', 'kg', 'litres', 'metres', 'sets', 'boxes', 'packets', 'rolls', 'pairs', 'bags', 'bottles'];

export default function AddProduct() {
  const { supplierId, supplierName } = useLocalSearchParams<{ supplierId: string; supplierName: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProcurementCategory>('OTHER');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [unit, setUnit] = useState('units');
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [customUnit, setCustomUnit] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [moq, setMoq] = useState('1');
  const [maxOrderQty, setMaxOrderQty] = useState('');
  const [gstPercent, setGstPercent] = useState('18');
  const [leadTimeDays, setLeadTimeDays] = useState('3');
  const [inStock, setInStock] = useState(true);

  const addMut = useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      procurementHubService.addSupplierProduct(Number(supplierId), payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-products', supplierId] });
      qc.invalidateQueries({ queryKey: ['procurement-products'] });
      Alert.alert('Product Added', `${name} has been added to ${decodeURIComponent(supplierName ?? '')} catalogue.`, [
        { text: 'Add Another', onPress: () => resetForm() },
        { text: 'Done', onPress: () => router.back() },
      ]);
    },
    onError: () => Alert.alert('Error', 'Failed to add product. Please try again.'),
  });

  function resetForm() {
    setName(''); setDescription(''); setCategory('OTHER'); setUnit('units');
    setWholesalePrice(''); setRetailPrice(''); setMoq('1'); setMaxOrderQty('');
    setGstPercent('18'); setLeadTimeDays('3'); setInStock(true);
  }

  function validate(): string | null {
    if (!name.trim()) return 'Product name is required';
    if (!wholesalePrice || parseFloat(wholesalePrice) <= 0) return 'Wholesale price must be greater than 0';
    if (!moq || parseInt(moq) < 1) return 'Minimum order quantity must be at least 1';
    return null;
  }

  function handleSubmit() {
    const err = validate();
    if (err) { Alert.alert('Validation', err); return; }

    const effectiveUnit = unit === '__custom__' ? customUnit.trim() : unit;
    if (!effectiveUnit) { Alert.alert('Validation', 'Enter a unit'); return; }

    addMut.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      unit: effectiveUnit,
      wholesalePrice: parseFloat(wholesalePrice),
      retailPrice: retailPrice ? parseFloat(retailPrice) : undefined,
      moq: parseInt(moq) || 1,
      gstPercent: parseFloat(gstPercent) || 18,
      leadTimeDays: parseInt(leadTimeDays) || 3,
    });
  }

  const selectedCat = CATEGORIES.find(c => c.value === category);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Supplier context */}
        <View style={s.contextCard}>
          <Ionicons name="business-outline" size={20} color="#2563EB" />
          <View>
            <Text style={s.contextLabel}>Adding product to</Text>
            <Text style={s.contextName}>{decodeURIComponent(supplierName ?? 'Supplier')}</Text>
          </View>
        </View>

        {/* Product details */}
        <Text style={s.sectionTitle}>Product Details</Text>

        <View style={s.field}>
          <Text style={s.fieldLabel}>Product Name *</Text>
          <TextInput
            style={s.fieldInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Floor Cleaning Liquid 1L"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={s.field}>
          <Text style={s.fieldLabel}>Description</Text>
          <TextInput
            style={[s.fieldInput, { minHeight: 72, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Brand, specifications, variants…"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Category picker */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Category *</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => setShowCatPicker(v => !v)}>
            <Text style={s.pickerValue}>{selectedCat?.emoji} {selectedCat?.label}</Text>
            <Ionicons name={showCatPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
          </TouchableOpacity>
          {showCatPicker && (
            <View style={s.pickerList}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[s.pickerOption, category === cat.value && s.pickerOptionActive]}
                  onPress={() => { setCategory(cat.value); setShowCatPicker(false); }}
                >
                  <Text style={[s.pickerOptionText, category === cat.value && s.pickerOptionTextActive]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Unit picker */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Unit *</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => setShowUnitPicker(v => !v)}>
            <Text style={s.pickerValue}>{unit === '__custom__' ? (customUnit || 'Custom…') : unit}</Text>
            <Ionicons name={showUnitPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
          </TouchableOpacity>
          {showUnitPicker && (
            <View style={s.pickerList}>
              {UNITS.map(u => (
                <TouchableOpacity
                  key={u}
                  style={[s.pickerOption, unit === u && s.pickerOptionActive]}
                  onPress={() => { setUnit(u); setShowUnitPicker(false); }}
                >
                  <Text style={[s.pickerOptionText, unit === u && s.pickerOptionTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.pickerOption, unit === '__custom__' && s.pickerOptionActive]}
                onPress={() => { setUnit('__custom__'); setShowUnitPicker(false); }}
              >
                <Text style={[s.pickerOptionText, unit === '__custom__' && s.pickerOptionTextActive]}>Custom…</Text>
              </TouchableOpacity>
            </View>
          )}
          {unit === '__custom__' && (
            <TextInput
              style={[s.fieldInput, { marginTop: 6 }]}
              value={customUnit}
              onChangeText={setCustomUnit}
              placeholder="Enter unit name"
              placeholderTextColor="#9CA3AF"
            />
          )}
        </View>

        {/* Pricing */}
        <Text style={s.sectionTitle}>Pricing & Stock</Text>

        <View style={s.twoCol}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.fieldLabel}>Wholesale Price (₹) *</Text>
            <TextInput
              style={s.fieldInput}
              value={wholesalePrice}
              onChangeText={setWholesalePrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.fieldLabel}>Retail MRP (₹)</Text>
            <TextInput
              style={s.fieldInput}
              value={retailPrice}
              onChangeText={setRetailPrice}
              keyboardType="decimal-pad"
              placeholder="Optional"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={s.twoCol}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.fieldLabel}>Min Order Qty *</Text>
            <TextInput
              style={s.fieldInput}
              value={moq}
              onChangeText={setMoq}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.fieldLabel}>Max Order Qty</Text>
            <TextInput
              style={s.fieldInput}
              value={maxOrderQty}
              onChangeText={setMaxOrderQty}
              keyboardType="numeric"
              placeholder="Unlimited"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={s.twoCol}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.fieldLabel}>GST %</Text>
            <TextInput
              style={s.fieldInput}
              value={gstPercent}
              onChangeText={setGstPercent}
              keyboardType="decimal-pad"
              placeholder="18"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.fieldLabel}>Lead Time (days)</Text>
            <TextInput
              style={s.fieldInput}
              value={leadTimeDays}
              onChangeText={setLeadTimeDays}
              keyboardType="numeric"
              placeholder="3"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={s.switchRow}>
          <View>
            <Text style={s.switchLabel}>In Stock</Text>
            <Text style={s.switchSub}>Product is currently available</Text>
          </View>
          <Switch
            value={inStock}
            onValueChange={setInStock}
            trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
            thumbColor={inStock ? '#059669' : '#9CA3AF'}
          />
        </View>

        {/* Price preview */}
        {wholesalePrice ? (
          <View style={s.previewCard}>
            <Text style={s.previewTitle}>Price Preview (per {unit === '__custom__' ? customUnit : unit})</Text>
            <View style={s.previewRow}>
              <Text style={s.previewLabel}>Wholesale</Text>
              <Text style={s.previewValue}>₹{parseFloat(wholesalePrice).toFixed(2)}</Text>
            </View>
            {retailPrice ? (
              <View style={s.previewRow}>
                <Text style={s.previewLabel}>MRP</Text>
                <Text style={[s.previewValue, s.strikethrough]}>₹{parseFloat(retailPrice).toFixed(2)}</Text>
              </View>
            ) : null}
            <View style={s.previewRow}>
              <Text style={s.previewLabel}>GST ({gstPercent}%)</Text>
              <Text style={s.previewValue}>+₹{(parseFloat(wholesalePrice) * (parseFloat(gstPercent) || 18) / 100).toFixed(2)}</Text>
            </View>
            <View style={[s.previewRow, s.previewTotalRow]}>
              <Text style={s.previewTotalLabel}>Buyer pays (incl. GST)</Text>
              <Text style={s.previewTotalValue}>
                ₹{(parseFloat(wholesalePrice) * (1 + (parseFloat(gstPercent) || 18) / 100)).toFixed(2)}
              </Text>
            </View>
            {moq && parseInt(moq) > 1 && (
              <Text style={s.moqNote}>MOQ: {moq} {unit === '__custom__' ? customUnit : unit}s minimum</Text>
            )}
          </View>
        ) : null}

        <TouchableOpacity
          style={[s.submitBtn, addMut.isPending && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={addMut.isPending}
        >
          {addMut.isPending
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={s.submitBtnText}>Add Product to Catalogue</Text>
              </>
          }
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, gap: 4 },
  contextCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  contextLabel: { fontSize: 11, color: '#3B82F6' },
  contextName: { fontSize: 14, fontWeight: '700', color: '#1E3A5F' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 10, marginBottom: 4 },
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  fieldInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  twoCol: { flexDirection: 'row', gap: 10 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FAFAFA',
  },
  pickerValue: { fontSize: 14, color: '#111827' },
  pickerList: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    backgroundColor: '#fff', marginTop: 4, maxHeight: 220, overflow: 'hidden',
    ...SHADOWS.sm,
  },
  pickerOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerOptionActive: { backgroundColor: '#EFF6FF' },
  pickerOptionText: { fontSize: 14, color: '#374151' },
  pickerOptionTextActive: { color: '#2563EB', fontWeight: '600' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  switchSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  previewCard: {
    backgroundColor: '#F0F9FF', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#BAE6FD',
  },
  previewTitle: { fontSize: 12, fontWeight: '700', color: '#0369A1', marginBottom: 8 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  previewLabel: { fontSize: 13, color: '#374151' },
  previewValue: { fontSize: 13, color: '#374151' },
  strikethrough: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  previewTotalRow: { borderTopWidth: 1, borderTopColor: '#BAE6FD', paddingTop: 6, marginTop: 4 },
  previewTotalLabel: { fontSize: 14, fontWeight: '700', color: '#1E3A5F' },
  previewTotalValue: { fontSize: 14, fontWeight: '700', color: '#1E3A5F' },
  moqNote: { fontSize: 11, color: '#0369A1', marginTop: 6 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', borderRadius: 14, padding: 16, marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
