import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { RFQItem, ProcurementCategory, CreateRFQPayload } from '@/types/procurement';

const CATEGORIES: { value: ProcurementCategory; label: string; emoji: string }[] = [
  { value: 'CLEANING_SUPPLIES',  label: 'Cleaning Supplies',  emoji: '🧹' },
  { value: 'ELECTRICAL',         label: 'Electrical',         emoji: '⚡' },
  { value: 'PLUMBING',           label: 'Plumbing',           emoji: '🔧' },
  { value: 'OFFICE_SUPPLIES',    label: 'Office Supplies',    emoji: '📎' },
  { value: 'GARDENING',          label: 'Gardening',          emoji: '🌿' },
  { value: 'SECURITY_EQUIPMENT', label: 'Security Equipment', emoji: '🔒' },
  { value: 'FURNITURE',          label: 'Furniture',          emoji: '🪑' },
  { value: 'IT_EQUIPMENT',       label: 'IT Equipment',       emoji: '💻' },
  { value: 'MAINTENANCE',        label: 'Maintenance',        emoji: '🔨' },
  { value: 'OTHER',              label: 'Other',              emoji: '📦' },
];

const emptyItem = (): Omit<RFQItem, 'id'> => ({
  productName: '', description: '', category: 'OTHER', unit: 'units', quantity: 1,
});

const TEMPLATES: Record<string, { title: string; items: Omit<RFQItem, 'id'>[] }> = {
  'monthly-cleaning': {
    title: 'Monthly Cleaning Supplies',
    items: [
      { productName: 'Floor Cleaning Liquid', description: '', category: 'CLEANING_SUPPLIES', unit: 'litres', quantity: 20 },
      { productName: 'Phenyl Concentrate', description: '', category: 'CLEANING_SUPPLIES', unit: 'litres', quantity: 10 },
      { productName: 'Toilet Freshener', description: '', category: 'CLEANING_SUPPLIES', unit: 'pieces', quantity: 15 },
      { productName: 'Heavy Duty Garbage Bags', description: '', category: 'CLEANING_SUPPLIES', unit: 'packets', quantity: 10 },
      { productName: 'Mops & Brooms Set', description: '', category: 'CLEANING_SUPPLIES', unit: 'sets', quantity: 3 },
    ],
  },
  'quarterly-electrical': {
    title: 'Quarterly Electrical Maintenance',
    items: [
      { productName: 'LED Bulbs 9W', description: '', category: 'ELECTRICAL', unit: 'pieces', quantity: 50 },
      { productName: 'MCB Switches 16A', description: '', category: 'ELECTRICAL', unit: 'pieces', quantity: 10 },
      { productName: 'PVC Cable Wire 2.5mm', description: '', category: 'ELECTRICAL', unit: 'metres', quantity: 100 },
      { productName: 'Extension Boards 4-port', description: '', category: 'ELECTRICAL', unit: 'pieces', quantity: 5 },
    ],
  },
  'annual-maintenance': {
    title: 'Annual Maintenance Items',
    items: [
      { productName: 'Exterior Weatherproof Paint', description: '', category: 'MAINTENANCE', unit: 'litres', quantity: 100 },
      { productName: 'Plumbing Repair Kit', description: '', category: 'PLUMBING', unit: 'sets', quantity: 3 },
      { productName: 'Pest Control Service (Quarterly)', description: '', category: 'MAINTENANCE', unit: 'visits', quantity: 4 },
      { productName: 'Lift Annual Maintenance Contract', description: '', category: 'MAINTENANCE', unit: 'contract', quantity: 1 },
    ],
  },
  'festival-setup': {
    title: 'Festival & Event Setup',
    items: [
      { productName: 'Decorative LED String Lights', description: '', category: 'ELECTRICAL', unit: 'metres', quantity: 200 },
      { productName: 'Printed Banners & Standees', description: '', category: 'OTHER', unit: 'pieces', quantity: 10 },
      { productName: 'Sound System Rental', description: '', category: 'OTHER', unit: 'days', quantity: 2 },
      { productName: 'Folding Chairs', description: '', category: 'FURNITURE', unit: 'pieces', quantity: 100 },
    ],
  },
};

function addDays(d: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

export default function NewRFQ() {
  const router = useRouter();
  const qc = useQueryClient();
  const { template, category } = useLocalSearchParams<{ template?: string; category?: string }>();

  const templateData = template ? TEMPLATES[template] : undefined;
  const categoryItem: Omit<RFQItem, 'id'> | null = category
    ? { productName: '', description: '', category: category as ProcurementCategory, unit: 'units', quantity: 1 }
    : null;

  const [title, setTitle] = useState(templateData?.title ?? '');
  const [description, setDescription] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [quotationDeadline, setQuotationDeadline] = useState(addDays(7));
  const [deliveryDeadline, setDeliveryDeadline] = useState(addDays(21));
  const [estimatedValue, setEstimatedValue] = useState('');
  const [approvedBudget, setApprovedBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Omit<RFQItem, 'id'>[]>(
    templateData?.items ?? (categoryItem ? [categoryItem] : [emptyItem()])
  );
  const [showCatPicker, setShowCatPicker] = useState<number | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: CreateRFQPayload) => procurementHubService.createRFQ(payload),
    onSuccess: (rfq) => {
      qc.invalidateQueries({ queryKey: ['procurement-rfqs'] });
      qc.invalidateQueries({ queryKey: ['procurement-stats'] });
      Alert.alert('RFQ Created', `RFQ ${rfq.rfqNumber} created. Publishing for suppliers.`, [
        {
          text: 'OK',
          onPress: () => {
            procurementHubService.publishRFQ(rfq.id).finally(() => {
              qc.invalidateQueries({ queryKey: ['procurement-rfqs'] });
              router.replace((`/procurement/rfq/${rfq.id}`) as any);
            });
          },
        },
      ]);
    },
    onError: () => Alert.alert('Error', 'Failed to create RFQ. Please try again.'),
  });

  function updateItem(idx: number, patch: Partial<Omit<RFQItem, 'id'>>) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()]);
  }

  function removeItem(idx: number) {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function validate(): string | null {
    if (!title.trim()) return 'RFQ title is required';
    if (!deliveryLocation.trim()) return 'Delivery location is required';
    for (let i = 0; i < items.length; i++) {
      if (!items[i].productName.trim()) return `Item ${i + 1}: product name is required`;
      if (!items[i].quantity || items[i].quantity < 1) return `Item ${i + 1}: quantity must be at least 1`;
    }
    return null;
  }

  function handleSubmit() {
    const err = validate();
    if (err) { Alert.alert('Validation', err); return; }
    const payload: CreateRFQPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      items,
      deliveryLocation: deliveryLocation.trim(),
      quotationDeadline,
      deliveryDeadline,
      estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
      approvedBudget: approvedBudget ? Number(approvedBudget) : undefined,
      notes: notes.trim() || undefined,
    };
    createMut.mutate(payload);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* RFQ Details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>RFQ Details</Text>

          <Text style={s.label}>Title <Text style={s.req}>*</Text></Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Cleaning supplies for Q4"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Specifications, brand preferences, any requirements…"
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={s.label}>Delivery Location <Text style={s.req}>*</Text></Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Block A Gate, Society Name"
            placeholderTextColor={COLORS.textMuted}
            value={deliveryLocation}
            onChangeText={setDeliveryLocation}
          />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Quote Deadline <Text style={s.req}>*</Text></Text>
              <TextInput
                style={s.input}
                value={quotationDeadline}
                onChangeText={setQuotationDeadline}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Delivery By <Text style={s.req}>*</Text></Text>
              <TextInput
                style={s.input}
                value={deliveryDeadline}
                onChangeText={setDeliveryDeadline}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Est. Value (₹)</Text>
              <TextInput
                style={s.input}
                placeholder="50000"
                placeholderTextColor={COLORS.textMuted}
                value={estimatedValue}
                onChangeText={setEstimatedValue}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Approved Budget (₹)</Text>
              <TextInput
                style={s.input}
                placeholder="45000"
                placeholderTextColor={COLORS.textMuted}
                value={approvedBudget}
                onChangeText={setApprovedBudget}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Line Items */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardTitle}>Line Items</Text>
            <TouchableOpacity style={s.addItemBtn} onPress={addItem}>
              <Ionicons name="add" size={16} color="#2563EB" />
              <Text style={s.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={s.itemBlock}>
              <View style={s.itemHeader}>
                <Text style={s.itemNum}>Item {idx + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(idx)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={s.label}>Product / Service <Text style={s.req}>*</Text></Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Floor cleaning liquid 5L"
                placeholderTextColor={COLORS.textMuted}
                value={item.productName}
                onChangeText={v => updateItem(idx, { productName: v })}
              />

              <Text style={s.label}>Category</Text>
              <TouchableOpacity style={s.picker} onPress={() => setShowCatPicker(idx)}>
                <Text style={s.pickerText}>
                  {CATEGORIES.find(c => c.value === item.category)?.emoji} {CATEGORIES.find(c => c.value === item.category)?.label || 'Select…'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>

              {showCatPicker === idx && (
                <View style={s.catDropdown}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity
                      key={c.value}
                      style={s.catOption}
                      onPress={() => { updateItem(idx, { category: c.value }); setShowCatPicker(null); }}
                    >
                      <Text style={s.catOptionText}>{c.emoji} {c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Qty <Text style={s.req}>*</Text></Text>
                  <TextInput
                    style={s.input}
                    placeholder="100"
                    placeholderTextColor={COLORS.textMuted}
                    value={String(item.quantity || '')}
                    onChangeText={v => updateItem(idx, { quantity: parseInt(v) || 1 })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Unit</Text>
                  <TextInput
                    style={s.input}
                    placeholder="units / kg / litre"
                    placeholderTextColor={COLORS.textMuted}
                    value={item.unit}
                    onChangeText={v => updateItem(idx, { unit: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Target ₹/unit</Text>
                  <TextInput
                    style={s.input}
                    placeholder="optional"
                    placeholderTextColor={COLORS.textMuted}
                    value={item.targetPricePerUnit ? String(item.targetPricePerUnit) : ''}
                    onChangeText={v => updateItem(idx, { targetPricePerUnit: parseFloat(v) || undefined })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={s.label}>Specifications</Text>
              <TextInput
                style={s.input}
                placeholder="Brand, grade, size, packaging details…"
                placeholderTextColor={COLORS.textMuted}
                value={item.specifications || ''}
                onChangeText={v => updateItem(idx, { specifications: v })}
              />
            </View>
          ))}
        </View>

        {/* Notes */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Additional Notes</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Payment terms preference, quality certifications required, other requirements…"
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, createMut.isPending && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={createMut.isPending}
          activeOpacity={0.85}
        >
          {createMut.isPending
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={s.submitText}>Create & Publish RFQ</Text>
              </>
          }
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 12, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 4 },
  req: { color: '#DC2626' },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: COLORS.text,
    backgroundColor: '#F8FAFC',
  },
  textArea: { textAlignVertical: 'top', minHeight: 72 },
  row: { flexDirection: 'row', gap: 8 },
  picker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#F8FAFC',
  },
  pickerText: { fontSize: 13, color: COLORS.text },
  catDropdown: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md,
    backgroundColor: '#fff', overflow: 'hidden', ...SHADOWS.md,
  },
  catOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  catOptionText: { fontSize: 13, color: COLORS.text },
  itemBlock: {
    gap: 6, paddingTop: 10, marginTop: 6,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNum: { fontSize: 13, fontWeight: '800', color: '#2563EB' },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 5,
  },
  addItemText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', borderRadius: RADIUS.lg, padding: 15, ...SHADOWS.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
