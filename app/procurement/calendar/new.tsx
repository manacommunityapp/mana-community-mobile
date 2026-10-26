import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, RADIUS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { ProcurementCategory, CalendarFrequency } from '@/types/procurement';

// ── Templates ─────────────────────────────────────────────────────────────────

interface Template {
  emoji: string;
  title: string;
  category: ProcurementCategory;
  frequency: CalendarFrequency;
  unit: string;
  quantity: number;
  estimatedBudget?: number;
  description?: string;
}

const TEMPLATES: Template[] = [
  { emoji: '🧹', title: 'Monthly Cleaning Supplies',   category: 'CLEANING_SUPPLIES', frequency: 'MONTHLY',   unit: 'lot',     quantity: 1,  estimatedBudget: 8000,  description: 'Cleaning chemicals, mops, brooms, dusters, floor cleaner' },
  { emoji: '⚡', title: 'Monthly Electrical Check',    category: 'ELECTRICAL',        frequency: 'MONTHLY',   unit: 'service', quantity: 1,  estimatedBudget: 5000,  description: 'Routine electrical inspection, bulb replacements, minor repairs' },
  { emoji: '🐛', title: 'Quarterly Pest Control',      category: 'MAINTENANCE',       frequency: 'QUARTERLY', unit: 'service', quantity: 1,  estimatedBudget: 15000, description: 'Full-society pest control treatment — cockroaches, mosquitoes, termites' },
  { emoji: '🔧', title: 'Quarterly Plumbing Inspection',category: 'PLUMBING',         frequency: 'QUARTERLY', unit: 'service', quantity: 1,  estimatedBudget: 10000, description: 'Plumbing check, leak repairs, water tank cleaning' },
  { emoji: '🔒', title: 'Annual Security Maintenance', category: 'SECURITY_EQUIPMENT',frequency: 'ANNUAL',    unit: 'service', quantity: 1,  estimatedBudget: 25000, description: 'CCTV servicing, intercom maintenance, barrier gate service' },
  { emoji: '🎨', title: 'Annual Painting / Whitewash', category: 'MAINTENANCE',       frequency: 'ANNUAL',    unit: 'sqft',    quantity: 5000, estimatedBudget: 80000, description: 'Common areas whitewashing, staircase & lobby painting' },
  { emoji: '🌿', title: 'Monthly Gardening & Landscaping', category: 'GARDENING',    frequency: 'MONTHLY',   unit: 'service', quantity: 1,  estimatedBudget: 6000,  description: 'Garden maintenance, mowing, pruning, watering, seasonal plants' },
  { emoji: '🛡️', title: 'Annual Fire Safety Audit',   category: 'SECURITY_EQUIPMENT',frequency: 'ANNUAL',    unit: 'service', quantity: 1,  estimatedBudget: 12000, description: 'Fire extinguisher refilling, hose reel check, fire panel service' },
];

const FREQ_OPTIONS: { value: CalendarFrequency; label: string }[] = [
  { value: 'WEEKLY',    label: 'Weekly' },
  { value: 'MONTHLY',   label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'BIANNUAL',  label: 'Bi-Annual' },
  { value: 'ANNUAL',    label: 'Annual' },
];

const CATEGORY_OPTIONS: { value: ProcurementCategory; label: string; emoji: string }[] = [
  { value: 'CLEANING_SUPPLIES',  label: 'Cleaning',    emoji: '🧹' },
  { value: 'ELECTRICAL',         label: 'Electrical',  emoji: '⚡' },
  { value: 'PLUMBING',           label: 'Plumbing',    emoji: '🔧' },
  { value: 'OFFICE_SUPPLIES',    label: 'Office',      emoji: '📎' },
  { value: 'GARDENING',          label: 'Gardening',   emoji: '🌿' },
  { value: 'SECURITY_EQUIPMENT', label: 'Security',    emoji: '🔒' },
  { value: 'FURNITURE',          label: 'Furniture',   emoji: '🪑' },
  { value: 'IT_EQUIPMENT',       label: 'IT',          emoji: '💻' },
  { value: 'FOOD_BEVERAGE',      label: 'Food',        emoji: '🍽️' },
  { value: 'MAINTENANCE',        label: 'Maintenance', emoji: '🔨' },
  { value: 'PACKAGING',          label: 'Packaging',   emoji: '📦' },
  { value: 'OTHER',              label: 'Other',       emoji: '🏷️' },
];

function nextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}

export default function NewCalendarEntry() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const qc = useQueryClient();
  const editId = params.id ? Number(params.id) : null;

  const [mode, setMode] = useState<'template' | 'custom'>(editId ? 'custom' : 'template');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  // Form state
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [category, setCategory] = useState<ProcurementCategory>('MAINTENANCE');
  const [frequency, setFrequency] = useState<CalendarFrequency>('MONTHLY');
  const [unit, setUnit]         = useState('service');
  const [quantity, setQuantity] = useState('1');
  const [budget, setBudget]     = useState('');
  const [location, setLocation] = useState('');
  const [nextDue, setNextDue]   = useState(nextMonth());
  const [notes, setNotes]       = useState('');

  // Load existing entry for edit
  const { data: entries = [] } = useQuery({
    queryKey: ['calendar-entries'],
    queryFn: procurementHubService.getCalendarEntries,
    enabled: !!editId,
  });

  useEffect(() => {
    if (editId && entries.length > 0) {
      const entry = entries.find(e => e.id === editId);
      if (entry) {
        setTitle(entry.title);
        setDesc(entry.description || '');
        setCategory(entry.category);
        setFrequency(entry.frequency);
        setUnit(entry.unit);
        setQuantity(String(entry.quantity));
        setBudget(entry.estimatedBudget ? String(entry.estimatedBudget) : '');
        setLocation(entry.deliveryLocation || '');
        setNextDue(entry.nextDueDate);
        setNotes(entry.notes || '');
      }
    }
  }, [editId, entries]);

  const createMutation = useMutation({
    mutationFn: procurementHubService.createCalendarEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-entries'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not save schedule.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      procurementHubService.updateCalendarEntry(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-entries'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not update schedule.'),
  });

  const busy = createMutation.isPending || updateMutation.isPending;

  function applyTemplate(t: Template, idx: number) {
    setSelectedTemplate(idx);
    setTitle(t.title);
    setDesc(t.description || '');
    setCategory(t.category);
    setFrequency(t.frequency);
    setUnit(t.unit);
    setQuantity(String(t.quantity));
    if (t.estimatedBudget) setBudget(String(t.estimatedBudget));
    setMode('custom');
  }

  function handleSubmit() {
    if (!title.trim()) return Alert.alert('Error', 'Title is required.');
    if (!nextDue) return Alert.alert('Error', 'Next due date is required.');

    const payload = {
      title: title.trim(),
      description: desc.trim() || undefined,
      category,
      frequency,
      unit: unit || 'service',
      quantity: Number(quantity) || 1,
      estimatedBudget: budget ? Number(budget) : undefined,
      deliveryLocation: location.trim() || undefined,
      nextDueDate: nextDue,
      notes: notes.trim() || undefined,
    };

    if (editId) {
      updateMutation.mutate({ id: editId, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Mode tabs */}
      {!editId && (
        <View style={s.modeRow}>
          {(['template', 'custom'] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[s.modeBtn, mode === m && s.modeBtnActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                {m === 'template' ? '📋 From Template' : '✏️ Custom'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Template grid */}
      {mode === 'template' && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Choose a Template</Text>
          <Text style={s.sectionSub}>Select a common recurring procurement to pre-fill the form</Text>
          <View style={tg.grid}>
            {TEMPLATES.map((t, i) => (
              <TouchableOpacity
                key={i}
                style={[tg.tile, selectedTemplate === i && tg.tileActive]}
                onPress={() => applyTemplate(t, i)}
                activeOpacity={0.8}
              >
                <Text style={tg.emoji}>{t.emoji}</Text>
                <Text style={tg.label} numberOfLines={2}>{t.title.replace('Monthly ', '').replace('Quarterly ', '').replace('Annual ', '')}</Text>
                <Text style={tg.freq}>{t.frequency.charAt(0) + t.frequency.slice(1).toLowerCase()}</Text>
                {t.estimatedBudget && (
                  <Text style={tg.budget}>₹{(t.estimatedBudget / 1000).toFixed(0)}K</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Custom form */}
      {mode === 'custom' && (
        <>
          <View style={s.section}>
            <Text style={s.sectionTitle}>{editId ? 'Edit Schedule' : 'Schedule Details'}</Text>

            <FieldLabel>Title *</FieldLabel>
            <TextInput
              style={s.input}
              placeholder="e.g., Monthly Cleaning Supplies"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <FieldLabel>Description</FieldLabel>
            <TextInput
              style={[s.input, { height: 64, textAlignVertical: 'top' }]}
              placeholder="What exactly needs to be procured?"
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={desc}
              onChangeText={setDesc}
            />

            <FieldLabel>Category</FieldLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {CATEGORY_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[s.chip, category === c.value && s.chipActive]}
                  onPress={() => setCategory(c.value)}
                >
                  <Text style={s.chipEmoji}>{c.emoji}</Text>
                  <Text style={[s.chipText, category === c.value && s.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <FieldLabel>Quantity</FieldLabel>
                <TextInput
                  style={s.input}
                  placeholder="1"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>Unit</FieldLabel>
                <TextInput
                  style={s.input}
                  placeholder="service / units / sqft"
                  placeholderTextColor={COLORS.textMuted}
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>

            <FieldLabel>Estimated Budget (₹)</FieldLabel>
            <TextInput
              style={s.input}
              placeholder="e.g., 8000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
            />

            <FieldLabel>Delivery Location</FieldLabel>
            <TextInput
              style={s.input}
              placeholder="e.g., Society Terrace / Basement"
              placeholderTextColor={COLORS.textMuted}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Recurrence</Text>

            <FieldLabel>Frequency</FieldLabel>
            <View style={s.freqRow}>
              {FREQ_OPTIONS.map(f => (
                <TouchableOpacity
                  key={f.value}
                  style={[s.freqBtn, frequency === f.value && s.freqBtnActive]}
                  onPress={() => setFrequency(f.value)}
                >
                  <Text style={[s.freqBtnText, frequency === f.value && s.freqBtnTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FieldLabel>Next Due Date *</FieldLabel>
            <TextInput
              style={s.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={nextDue}
              onChangeText={setNextDue}
            />

            <FieldLabel>Notes</FieldLabel>
            <TextInput
              style={[s.input, { height: 56, textAlignVertical: 'top' }]}
              placeholder="Supplier preferences, special requirements…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Preview */}
          <View style={s.preview}>
            <Text style={s.previewTitle}>📅 Schedule Preview</Text>
            <PRow label="Frequency" val={FREQ_OPTIONS.find(f => f.value === frequency)?.label ?? frequency} />
            <PRow label="Next Due"  val={nextDue || '—'} />
            {budget ? <PRow label="Budget" val={`₹${Number(budget).toLocaleString('en-IN')}`} /> : null}
            {quantity ? <PRow label="Qty" val={`${quantity} ${unit}`} /> : null}
          </View>

          <TouchableOpacity
            style={[s.submitBtn, busy && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="calendar-outline" size={18} color="#fff" />
                  <Text style={s.submitText}>{editId ? 'Save Changes' : 'Add to Schedule'}</Text>
                </>}
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={s.fieldLabel}>{children}</Text>;
}

function PRow({ label, val }: { label: string; val: string }) {
  return (
    <View style={s.previewRow}>
      <Text style={s.previewLabel}>{label}</Text>
      <Text style={s.previewVal}>{val}</Text>
    </View>
  );
}

const tg = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '47%', backgroundColor: '#F8FAFC', borderRadius: RADIUS.lg,
    padding: 12, gap: 4, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center',
  },
  tileActive: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  emoji: { fontSize: 28, marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '700', color: '#1E293B', textAlign: 'center', lineHeight: 15 },
  freq: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  budget: { fontSize: 11, fontWeight: '800', color: '#059669', marginTop: 2 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 14, gap: 14 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md,
    alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  modeBtnActive: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  modeBtnTextActive: { color: '#059669', fontWeight: '800' },
  section: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  sectionSub: { fontSize: 12, color: COLORS.textMuted, marginTop: -4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: COLORS.text, backgroundColor: '#F8FAFC',
  },
  row: { flexDirection: 'row', gap: 10 },
  chips: { gap: 6, paddingBottom: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  chipTextActive: { color: '#059669' },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  freqBtnActive: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  freqBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  freqBtnTextActive: { color: '#059669', fontWeight: '800' },
  preview: {
    backgroundColor: '#065F46', borderRadius: RADIUS.lg, padding: 14, gap: 8,
  },
  previewTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  previewVal: { fontSize: 11, color: '#fff', fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  submitBtn: {
    backgroundColor: '#059669', borderRadius: RADIUS.md, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
