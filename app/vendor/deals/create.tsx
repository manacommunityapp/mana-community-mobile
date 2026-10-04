import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';
import { vendorService } from '@/services/vendorService';

export default function CreateGroupDealScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [description, setDescription] = useState('');
  const [mrp, setMrp] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [moq, setMoq] = useState('');
  const [pricingModel, setPricingModel] = useState<'THRESHOLD' | 'GUARANTEED' | 'TARGET_OR_CANCEL'>('THRESHOLD');
  const [pickupLocation, setPickupLocation] = useState('Clubhouse Ground Floor Desk');
  const [pickupDate, setPickupDate] = useState('2026-10-12');
  const [daysDuration, setDaysDuration] = useState('5');

  const createMutation = useMutation({
    mutationFn: (data: any) => vendorService.createGroupDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-deals'] });
      queryClient.invalidateQueries({ queryKey: ['group-deals'] });
      Alert.alert('Campaign Created!', 'Your bulk group deal is now live for community orders.', [
        { text: 'View Deals', onPress: () => router.back() }
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Could not create group deal. Please verify details.');
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !mrp || !basePrice || !moq) {
      Alert.alert('Incomplete Form', 'Please fill product title, MRP, base price, and minimum order quantity (MOQ).');
      return;
    }

    const mrpNum = parseFloat(mrp);
    const basePriceNum = parseFloat(basePrice);
    const moqNum = parseInt(moq, 10);

    const dealPayload = {
      title: title.trim(),
      category,
      description: description.trim() || 'Direct wholesale community supply.',
      mrp: mrpNum,
      standardPrice: mrpNum,
      currentTierPrice: basePriceNum,
      targetQty: moqNum,
      moqLabel: `${moqNum} units`,
      pricingModel,
      pricingType: 'QUANTITY',
      pickupPoint: pickupLocation,
      pickupDate,
      daysLeft: parseInt(daysDuration, 10) || 5,
      dealEndsAt: new Date(Date.now() + (parseInt(daysDuration, 10) || 5) * 86400000).toISOString(),
      fulfillmentType: 'BOTH',
      paymentType: 'FULL',
      priceTiers: [
        { id: 't1', minQty: 1, maxQty: Math.floor(moqNum / 2), price: basePriceNum, label: `1?${Math.floor(moqNum / 2)} units`, isCurrentTier: true, isNextTier: false },
        { id: 't2', minQty: Math.floor(moqNum / 2) + 1, maxQty: moqNum, price: Math.round(basePriceNum * 0.95), label: `${Math.floor(moqNum / 2) + 1}+ units`, isCurrentTier: false, isNextTier: true, unitsToUnlock: Math.floor(moqNum / 2) },
        { id: 't3', minQty: moqNum + 1, maxQty: null, price: Math.round(basePriceNum * 0.9), label: `${moqNum}+ units (Super Bulk)`, isCurrentTier: false, isNextTier: false, unitsToUnlock: moqNum },
      ],
    };

    createMutation.mutate(dealPayload);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Launch Group Deal</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Product & Category</Text>

          <Text style={s.label}>Product Title *</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Premium Sona Masoori Rice 25 KG"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={s.label}>Category</Text>
          <View style={s.pillsRow}>
            {['Grocery', 'Fresh', 'Dairy', 'Festival', 'Home'].map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.pill, category === cat && s.pillActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[s.pillText, category === cat && s.pillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Product Description</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Describe batch sourcing, expiry dates, pack packaging..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Pricing & MOQ */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Wholesale Pricing & Volume Rules</Text>

          <View style={s.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Retail MRP (?) *</Text>
              <TextInput
                style={s.input}
                placeholder="1000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={mrp}
                onChangeText={setMrp}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Starting Rate (?) *</Text>
              <TextInput
                style={s.input}
                placeholder="850"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={basePrice}
                onChangeText={setBasePrice}
              />
            </View>
          </View>

          <View style={s.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Target MOQ (Units) *</Text>
              <TextInput
                style={s.input}
                placeholder="50"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={moq}
                onChangeText={setMoq}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Campaign Duration</Text>
              <TextInput
                style={s.input}
                placeholder="5 days"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={daysDuration}
                onChangeText={setDaysDuration}
              />
            </View>
          </View>

          <Text style={s.label}>Pricing Strategy</Text>
          <View style={s.modelSelector}>
            {[
              { id: 'THRESHOLD', title: 'Threshold (Volume Tiers)', desc: 'Price drops as more units are locked' },
              { id: 'GUARANTEED', title: 'Guaranteed Flat Rate', desc: 'Single fixed community price' },
              { id: 'TARGET_OR_CANCEL', title: 'Target-or-Cancel', desc: 'Auto refund if MOQ not reached' },
            ].map(m => (
              <TouchableOpacity
                key={m.id}
                style={[s.modelCard, pricingModel === m.id && s.modelCardActive]}
                onPress={() => setPricingModel(m.id as any)}
              >
                <View style={s.modelRadio}>
                  {pricingModel === m.id && <View style={s.modelRadioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.modelTitle}>{m.title}</Text>
                  <Text style={s.modelDesc}>{m.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logistics */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Logistics & Pickup Handover</Text>

          <Text style={s.label}>Community Pickup Point</Text>
          <TextInput
            style={s.input}
            value={pickupLocation}
            onChangeText={setPickupLocation}
          />

          <Text style={s.label}>Expected Dispatch Date</Text>
          <TextInput
            style={s.input}
            value={pickupDate}
            onChangeText={setPickupDate}
          />
        </View>

        <TouchableOpacity
          style={[s.submitBtn, createMutation.isPending && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          activeOpacity={0.85}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.submitBtnText}>?? Publish Group Deal</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    ...SHADOWS.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: 4 },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: { height: 72, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 12 },
  pillsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: VENDOR_COLORS.accent, borderColor: VENDOR_COLORS.accent },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  pillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  modelSelector: { gap: 8 },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modelCardActive: { borderColor: VENDOR_COLORS.accent, backgroundColor: VENDOR_COLORS.accentLight },
  modelRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: VENDOR_COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: VENDOR_COLORS.accent },
  modelTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  modelDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  submitBtn: {
    backgroundColor: VENDOR_COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
