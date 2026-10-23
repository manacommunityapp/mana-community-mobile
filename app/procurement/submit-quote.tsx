import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { SupplierProfile, RFQItem, SubmitQuotePayload, QuoteItemSubmit } from '@/types/procurement';

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

interface LineItem {
  rfqItemId?: number;
  productName: string;
  unit: string;
  quantity: number;
  pricePerUnit: string;
  gstPercent: string;
  leadTimeDays: string;
}

export default function SubmitQuote() {
  const { rfqId, rfqTitle } = useLocalSearchParams<{ rfqId: string; rfqTitle: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: rfq, isLoading: rfqLoading } = useQuery({
    queryKey: ['rfq', rfqId],
    queryFn: () => procurementHubService.getRFQ(Number(rfqId)),
    enabled: !!rfqId,
  });

  const { data: suppliers = [], isLoading: suppLoading } = useQuery<SupplierProfile[]>({
    queryKey: ['procurement-suppliers'],
    queryFn: () => procurementHubService.getSuppliers({ verified: true }),
  });

  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState('0');
  const [validUntil, setValidUntil] = useState(addDays(14));
  const [deliveryDate, setDeliveryDate] = useState(addDays(21));
  const [paymentTerms, setPaymentTerms] = useState('30 days credit');
  const [notes, setNotes] = useState('');

  const [lineItems, setLineItems] = useState<LineItem[]>(() =>
    rfq?.items?.map((item: RFQItem) => ({
      rfqItemId: item.id,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      pricePerUnit: '',
      gstPercent: '18',
      leadTimeDays: '3',
    })) ?? []
  );

  // Sync line items when rfq loads
  React.useEffect(() => {
    if (rfq?.items && lineItems.length === 0) {
      setLineItems(rfq.items.map((item: RFQItem) => ({
        rfqItemId: item.id,
        productName: item.productName,
        unit: item.unit,
        quantity: item.quantity,
        pricePerUnit: '',
        gstPercent: '18',
        leadTimeDays: '3',
      })));
    }
  }, [rfq]);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const totals = useMemo(() => {
    let sub = 0, gst = 0;
    for (const li of lineItems) {
      const price = parseFloat(li.pricePerUnit) || 0;
      const lineTotal = price * li.quantity;
      const gstPct = parseFloat(li.gstPercent) || 18;
      sub += lineTotal;
      gst += lineTotal * gstPct / 100;
    }
    const delivery = parseFloat(deliveryCharge) || 0;
    return { sub, gst, delivery, grand: sub + gst + delivery };
  }, [lineItems, deliveryCharge]);

  const submitMut = useMutation({
    mutationFn: (payload: SubmitQuotePayload) =>
      procurementHubService.submitQuote(Number(rfqId), payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rfq-quotes', rfqId] });
      qc.invalidateQueries({ queryKey: ['rfq', rfqId] });
      Alert.alert('Quote Recorded', 'Supplier quote has been saved and is ready for comparison.', [
        { text: 'View Quotes', onPress: () => router.push(`/procurement/rfq/${rfqId}` as any) },
      ]);
    },
    onError: () => Alert.alert('Error', 'Failed to save quote. Please try again.'),
  });

  function validate(): string | null {
    if (!supplierId) return 'Select a supplier';
    for (const li of lineItems) {
      if (!li.pricePerUnit || parseFloat(li.pricePerUnit) <= 0) {
        return `Enter price for ${li.productName}`;
      }
    }
    if (!validUntil) return 'Enter quote valid until date';
    if (!deliveryDate) return 'Enter expected delivery date';
    return null;
  }

  function handleSubmit() {
    const err = validate();
    if (err) { Alert.alert('Validation', err); return; }

    const items: QuoteItemSubmit[] = lineItems.map(li => ({
      rfqItemId: li.rfqItemId,
      productName: li.productName,
      unit: li.unit,
      quantity: li.quantity,
      pricePerUnit: parseFloat(li.pricePerUnit),
      gstPercent: parseFloat(li.gstPercent) || 18,
      leadTimeDays: parseInt(li.leadTimeDays) || 3,
    }));

    submitMut.mutate({
      supplierId: supplierId!,
      items,
      deliveryCharge: parseFloat(deliveryCharge) || 0,
      validUntil,
      deliveryDate,
      paymentTerms: paymentTerms.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  if (rfqLoading || suppLoading) {
    return (
      <View style={s.center}><ActivityIndicator size="large" color="#2563EB" /></View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* RFQ Summary */}
        <View style={s.rfqCard}>
          <Text style={s.rfqLabel}>Recording quote for RFQ</Text>
          <Text style={s.rfqTitle}>{rfq?.title ?? rfqTitle ?? `RFQ #${rfqId}`}</Text>
          {rfq?.rfqNumber && <Text style={s.rfqNumber}>{rfq.rfqNumber}</Text>}
          {rfq?.items && (
            <Text style={s.rfqItems}>{rfq.items.length} line item{rfq.items.length !== 1 ? 's' : ''}</Text>
          )}
        </View>

        {/* Supplier Picker */}
        <Text style={s.sectionTitle}>Select Supplier</Text>
        <TouchableOpacity style={s.pickerBtn} onPress={() => setShowSupplierPicker(v => !v)}>
          <View style={{ flex: 1 }}>
            {selectedSupplier
              ? <Text style={s.pickerSelected}>{selectedSupplier.businessName}</Text>
              : <Text style={s.pickerPlaceholder}>Choose a verified supplier…</Text>
            }
          </View>
          <Ionicons name={showSupplierPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
        </TouchableOpacity>

        {showSupplierPicker && (
          <View style={s.pickerDropdown}>
            {suppliers.filter(s => s.verificationStatus === 'VERIFIED').map(supp => (
              <TouchableOpacity
                key={supp.id}
                style={[s.pickerOption, supplierId === supp.id && s.pickerOptionActive]}
                onPress={() => { setSupplierId(supp.id); setShowSupplierPicker(false); }}
              >
                <Text style={[s.pickerOptionText, supplierId === supp.id && s.pickerOptionTextActive]}>
                  {supp.businessName}
                </Text>
                <Text style={s.pickerOptionSub}>{supp.city} · ⭐ {supp.rating?.toFixed(1) ?? '—'}</Text>
              </TouchableOpacity>
            ))}
            {suppliers.filter(s => s.verificationStatus === 'VERIFIED').length === 0 && (
              <Text style={s.pickerEmpty}>No verified suppliers. Verify suppliers first.</Text>
            )}
          </View>
        )}

        {/* Line Items Pricing */}
        <Text style={s.sectionTitle}>Quote Line Items</Text>
        {lineItems.map((li, idx) => (
          <View key={idx} style={s.lineCard}>
            <View style={s.lineHeader}>
              <Text style={s.lineName}>{li.productName}</Text>
              <Text style={s.lineQty}>Qty: {li.quantity} {li.unit}</Text>
            </View>
            <View style={s.lineFields}>
              <View style={s.lineField}>
                <Text style={s.lineFieldLabel}>Price/Unit (₹) *</Text>
                <TextInput
                  style={s.lineInput}
                  value={li.pricePerUnit}
                  onChangeText={t => setLineItems(items => items.map((item, i) =>
                    i === idx ? { ...item, pricePerUnit: t } : item))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={s.lineField}>
                <Text style={s.lineFieldLabel}>GST %</Text>
                <TextInput
                  style={s.lineInput}
                  value={li.gstPercent}
                  onChangeText={t => setLineItems(items => items.map((item, i) =>
                    i === idx ? { ...item, gstPercent: t } : item))}
                  keyboardType="decimal-pad"
                  placeholder="18"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={s.lineField}>
                <Text style={s.lineFieldLabel}>Lead Days</Text>
                <TextInput
                  style={s.lineInput}
                  value={li.leadTimeDays}
                  onChangeText={t => setLineItems(items => items.map((item, i) =>
                    i === idx ? { ...item, leadTimeDays: t } : item))}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            {li.pricePerUnit ? (
              <Text style={s.lineTotal}>
                Line total: {fmt(parseFloat(li.pricePerUnit) * li.quantity)} + {li.gstPercent}% GST
              </Text>
            ) : null}
          </View>
        ))}

        {/* Delivery & Terms */}
        <Text style={s.sectionTitle}>Delivery & Terms</Text>
        <View style={s.twoCol}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.fieldLabel}>Delivery Charge (₹)</Text>
            <TextInput
              style={s.fieldInput}
              value={deliveryCharge}
              onChangeText={setDeliveryCharge}
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.fieldLabel}>Valid Until</Text>
            <TextInput
              style={s.fieldInput}
              value={validUntil}
              onChangeText={setValidUntil}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
        <View style={s.field}>
          <Text style={s.fieldLabel}>Delivery Date</Text>
          <TextInput
            style={s.fieldInput}
            value={deliveryDate}
            onChangeText={setDeliveryDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <View style={s.field}>
          <Text style={s.fieldLabel}>Payment Terms</Text>
          <TextInput
            style={s.fieldInput}
            value={paymentTerms}
            onChangeText={setPaymentTerms}
            placeholder="e.g. 30 days credit"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <View style={s.field}>
          <Text style={s.fieldLabel}>Notes</Text>
          <TextInput
            style={[s.fieldInput, { minHeight: 72, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Any additional notes…"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Quote Summary */}
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>Quote Summary</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>{fmt(totals.sub)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>GST</Text>
            <Text style={s.summaryValue}>{fmt(totals.gst)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Delivery</Text>
            <Text style={s.summaryValue}>{fmt(totals.delivery)}</Text>
          </View>
          <View style={[s.summaryRow, s.summaryTotal]}>
            <Text style={s.summaryTotalLabel}>Grand Total</Text>
            <Text style={s.summaryTotalValue}>{fmt(totals.grand)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, submitMut.isPending && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitMut.isPending}
        >
          {submitMut.isPending
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={s.submitBtnText}>Record Quote</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rfqCard: {
    backgroundColor: '#1E3A5F', borderRadius: 14, padding: 14, marginBottom: 12,
  },
  rfqLabel: { fontSize: 11, color: '#93C5FD', fontWeight: '500', marginBottom: 4 },
  rfqTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  rfqNumber: { fontSize: 12, color: '#93C5FD', marginTop: 2 },
  rfqItems: { fontSize: 12, color: '#BFDBFE', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 6 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 2,
  },
  pickerSelected: { fontSize: 14, color: '#111827', fontWeight: '500' },
  pickerPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  pickerDropdown: {
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8,
    ...SHADOWS.sm,
  },
  pickerOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerOptionActive: { backgroundColor: '#EFF6FF' },
  pickerOptionText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  pickerOptionTextActive: { color: '#2563EB' },
  pickerOptionSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  pickerEmpty: { padding: 16, color: '#9CA3AF', fontSize: 13, textAlign: 'center' },
  lineCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lineName: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },
  lineQty: { fontSize: 12, color: '#6B7280' },
  lineFields: { flexDirection: 'row', gap: 8 },
  lineField: { flex: 1 },
  lineFieldLabel: { fontSize: 11, color: '#6B7280', marginBottom: 3 },
  lineInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  lineTotal: { fontSize: 11, color: '#059669', marginTop: 6 },
  twoCol: { flexDirection: 'row', gap: 10 },
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  fieldInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  summaryCard: {
    backgroundColor: '#F0F9FF', borderRadius: 14, padding: 14,
    marginTop: 8, marginBottom: 12, borderWidth: 1, borderColor: '#BAE6FD',
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#0369A1', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { fontSize: 13, color: '#374151' },
  summaryValue: { fontSize: 13, color: '#374151' },
  summaryTotal: {
    borderTopWidth: 1, borderTopColor: '#BAE6FD', marginTop: 6, paddingTop: 6,
  },
  summaryTotalLabel: { fontSize: 15, fontWeight: '700', color: '#1E3A5F' },
  summaryTotalValue: { fontSize: 15, fontWeight: '700', color: '#1E3A5F' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', borderRadius: 14, padding: 16, marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
