import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, RADIUS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { ProcurementCategory } from '@/types/procurement';

const DATE_7  = new Date(Date.now() + 7  * 86400000).toISOString().slice(0, 16);
const DATE_30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const DATE_45 = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);

const CATEGORY_OPTIONS: { value: ProcurementCategory; label: string; emoji: string }[] = [
  { value: 'CLEANING_SUPPLIES', label: 'Cleaning',  emoji: '🧹' },
  { value: 'ELECTRICAL',        label: 'Electrical', emoji: '⚡' },
  { value: 'PLUMBING',          label: 'Plumbing',   emoji: '🔧' },
  { value: 'OFFICE_SUPPLIES',   label: 'Office',     emoji: '📎' },
  { value: 'GARDENING',         label: 'Gardening',  emoji: '🌿' },
  { value: 'SECURITY_EQUIPMENT',label: 'Security',   emoji: '🔒' },
  { value: 'FURNITURE',         label: 'Furniture',  emoji: '🪑' },
  { value: 'IT_EQUIPMENT',      label: 'IT',         emoji: '💻' },
  { value: 'FOOD_BEVERAGE',     label: 'Food',       emoji: '🍽️' },
  { value: 'MAINTENANCE',       label: 'Maintenance', emoji: '🔨' },
  { value: 'PACKAGING',         label: 'Packaging',  emoji: '📦' },
  { value: 'OTHER',             label: 'Other',      emoji: '🏷️' },
];

export default function NewAuction() {
  const router = useRouter();
  const params = useLocalSearchParams<{ rfqId?: string }>();
  const qc = useQueryClient();

  // Existing RFQ mode
  const [mode, setMode] = useState<'new' | 'existing'>(params.rfqId ? 'existing' : 'new');

  // New RFQ fields
  const [title, setTitle] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<ProcurementCategory>('MAINTENANCE');
  const [unit, setUnit] = useState('units');
  const [quantity, setQuantity] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryDeadline, setDeliveryDeadline] = useState(DATE_45);
  const [quotationDeadline, setQuotationDeadline] = useState(DATE_30);

  // Auction settings
  const [auctionDeadline, setAuctionDeadline] = useState(DATE_7);
  const [reservePrice, setReservePrice] = useState('');

  // Existing RFQ mode
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(
    params.rfqId ? Number(params.rfqId) : null,
  );

  const { data: openRFQs = [] } = useQuery({
    queryKey: ['rfqs', 'OPEN'],
    queryFn: () => procurementHubService.getRFQs('OPEN'),
    enabled: mode === 'existing',
  });

  const createRFQMutation = useMutation({
    mutationFn: procurementHubService.createRFQ,
    onSuccess: async (rfq) => {
      await procurementHubService.publishRFQ(rfq.id);
      await enableMutation.mutateAsync({ rfqId: rfq.id });
    },
    onError: () => Alert.alert('Error', 'Could not create RFQ.'),
  });

  const enableMutation = useMutation({
    mutationFn: ({ rfqId }: { rfqId: number }) =>
      procurementHubService.enableAuctionMode(rfqId, {
        auctionDeadline: new Date(auctionDeadline).toISOString(),
        reservePrice: reservePrice ? Number(reservePrice) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auctions'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not enable auction mode.'),
  });

  const busy = createRFQMutation.isPending || enableMutation.isPending;

  async function handleSubmit() {
    if (mode === 'existing') {
      if (!selectedRfqId) return Alert.alert('Error', 'Select an open RFQ.');
      await enableMutation.mutateAsync({ rfqId: selectedRfqId });
      return;
    }
    if (!title.trim() || !itemName.trim() || !deliveryLocation.trim()) {
      return Alert.alert('Error', 'Fill in title, item name, and delivery location.');
    }
    await createRFQMutation.mutateAsync({
      title: title.trim(),
      items: [{
        productName: itemName.trim(),
        category,
        unit: unit || 'units',
        quantity: Number(quantity) || 1,
        targetPricePerUnit: targetPrice ? Number(targetPrice) : undefined,
      }],
      deliveryLocation: deliveryLocation.trim(),
      deliveryDeadline,
      quotationDeadline,
    });
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Mode toggle */}
      <View style={s.modeRow}>
        {(['new', 'existing'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[s.modeBtn, mode === m && s.modeBtnActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
              {m === 'new' ? '🆕 New RFQ' : '📋 Existing RFQ'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'new' && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>RFQ Details</Text>
          <Label>Auction Title *</Label>
          <TextInput
            style={s.input}
            placeholder="e.g., Annual Elevator Maintenance Bid"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <Label>Item / Service *</Label>
          <TextInput
            style={s.input}
            placeholder="e.g., Full elevator maintenance contract"
            placeholderTextColor={COLORS.textMuted}
            value={itemName}
            onChangeText={setItemName}
          />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Label>Quantity</Label>
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
              <Label>Unit</Label>
              <TextInput
                style={s.input}
                placeholder="units"
                placeholderTextColor={COLORS.textMuted}
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>
          <Label>Target Price / Unit (₹)</Label>
          <TextInput
            style={s.input}
            placeholder="Optional — your estimate"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={targetPrice}
            onChangeText={setTargetPrice}
          />
          <Label>Category</Label>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
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
          <Label>Delivery Location *</Label>
          <TextInput
            style={s.input}
            placeholder="e.g., Society Gate / Basement"
            placeholderTextColor={COLORS.textMuted}
            value={deliveryLocation}
            onChangeText={setDeliveryLocation}
          />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Label>Quotes By</Label>
              <TextInput
                style={s.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={quotationDeadline}
                onChangeText={setQuotationDeadline}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Delivery By</Label>
              <TextInput
                style={s.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={deliveryDeadline}
                onChangeText={setDeliveryDeadline}
              />
            </View>
          </View>
        </View>
      )}

      {mode === 'existing' && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Select Open RFQ</Text>
          {openRFQs.length === 0 && (
            <Text style={s.noRfqText}>No open RFQs found. Create a new one instead.</Text>
          )}
          {openRFQs.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[s.rfqRow, selectedRfqId === r.id && s.rfqRowActive]}
              onPress={() => setSelectedRfqId(r.id)}
            >
              <Ionicons
                name={selectedRfqId === r.id ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={selectedRfqId === r.id ? '#7C3AED' : COLORS.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.rfqTitle}>{r.title}</Text>
                <Text style={s.rfqSub}>{r.rfqNumber} · Quotes by {r.quotationDeadline}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Auction settings */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Auction Settings</Text>
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color="#7C3AED" />
          <Text style={s.infoText}>
            Suppliers will see this RFQ and submit competitive bids. The auction closes at the deadline and you award to the winning bid.
          </Text>
        </View>
        <Label>Bidding Deadline (date & time) *</Label>
        <TextInput
          style={s.input}
          placeholder="YYYY-MM-DDTHH:MM"
          placeholderTextColor={COLORS.textMuted}
          value={auctionDeadline}
          onChangeText={setAuctionDeadline}
        />
        <Label>Reserve Price / Max Acceptable Bid (₹)</Label>
        <TextInput
          style={s.input}
          placeholder="Optional — bids above this won't be considered"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={reservePrice}
          onChangeText={setReservePrice}
        />
      </View>

      {/* Preview */}
      <View style={s.preview}>
        <Text style={s.previewTitle}>🔨 Auction Preview</Text>
        <Row label="Mode" val="Reverse Auction (lowest bid wins)" />
        <Row label="Deadline" val={auctionDeadline || '—'} />
        {reservePrice ? <Row label="Reserve" val={`₹${Number(reservePrice).toLocaleString('en-IN')}`} /> : null}
        <Row label="Visibility" val="All verified suppliers" />
        <Row label="Bidding" val="One active bid per supplier; can revise" />
      </View>

      <TouchableOpacity style={[s.submitBtn, busy && { opacity: 0.6 }]} onPress={handleSubmit} disabled={busy}>
        {busy
          ? <ActivityIndicator color="#fff" size="small" />
          : <>
              <Ionicons name="hammer-outline" size={18} color="#fff" />
              <Text style={s.submitText}>Launch Auction</Text>
            </>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <View style={s.previewRow}>
      <Text style={s.previewLabel}>{label}</Text>
      <Text style={s.previewVal}>{val}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 14, gap: 14 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md,
    alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  modeBtnActive: { backgroundColor: '#F5F3FF', borderColor: '#C4B5FD' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  modeBtnTextActive: { color: '#7C3AED', fontWeight: '800' },
  section: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  label: { fontSize: 12, fontWeight: '700', color: '#475569' },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: COLORS.text, backgroundColor: '#F8FAFC',
  },
  row: { flexDirection: 'row', gap: 10 },
  chips: { gap: 6, paddingBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#F5F3FF', borderColor: '#C4B5FD' },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  chipTextActive: { color: '#7C3AED' },
  infoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#F5F3FF', borderRadius: RADIUS.md, padding: 10,
  },
  infoText: { flex: 1, fontSize: 12, color: '#5B21B6', lineHeight: 18 },
  noRfqText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 16 },
  rfqRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  rfqRowActive: { backgroundColor: '#F5F3FF', borderColor: '#C4B5FD' },
  rfqTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  rfqSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  preview: {
    backgroundColor: '#1E3A5F', borderRadius: RADIUS.lg, padding: 14, gap: 8,
  },
  previewTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  previewVal: { fontSize: 11, color: '#fff', fontWeight: '700', flexShrink: 1, textAlign: 'right', maxWidth: '60%' },
  submitBtn: {
    backgroundColor: '#7C3AED', borderRadius: RADIUS.md, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
