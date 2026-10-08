import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';
import { vendorService } from '@/services/vendorService';

export default function CreateGroupDealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    category?: string;
    description?: string;
    mrp?: string;
    basePrice?: string;
    moq?: string;
    productId?: string;
    variantId?: string;
  }>();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(params.title || '');
  const [category, setCategory] = useState(params.category || 'Grocery');
  const [description, setDescription] = useState(params.description || '');
  const [mrp, setMrp] = useState(params.mrp || '');
  const [basePrice, setBasePrice] = useState(params.basePrice || '');
  const [moq, setMoq] = useState(params.moq || '');
  const [pricingModel, setPricingModel] = useState<'THRESHOLD' | 'GUARANTEED' | 'TARGET_OR_CANCEL'>('THRESHOLD');
  const [pickupLocation, setPickupLocation] = useState('Clubhouse Ground Floor Desk');
  const [pickupDate, setPickupDate] = useState('2026-10-12');
  const [daysDuration, setDaysDuration] = useState('5');

  useEffect(() => {
    if (params.title) setTitle(params.title);
    if (params.category) setCategory(params.category);
    if (params.description) setDescription(params.description);
    if (params.mrp) setMrp(params.mrp);
    if (params.basePrice) setBasePrice(params.basePrice);
    if (params.moq) setMoq(params.moq);
  }, [params.title, params.category, params.description, params.mrp, params.basePrice, params.moq]);

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
        { id: 't1', minQty: 1, maxQty: Math.floor(moqNum / 2), price: basePriceNum, label: `1–${Math.floor(moqNum / 2)} units`, isCurrentTier: true, isNextTier: false },
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
        {params.title && (
          <View style={s.prefillBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
            <Text style={s.prefillBannerText}>Prefilled from My Store Catalog</Text>
          </View>
        )}

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
              <Text style={s.label}>Retail MRP (₹) *</Text>
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
              <Text style={s.label}>Starting Rate (₹) *</Text>
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

          <Text style={s.label}>Minimum Target Order Quantity (MOQ) *</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. 50 units"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={moq}
            onChangeText={setMoq}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, createMutation.isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={s.submitBtnText}>Publish Group Deal</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  content: { padding: SPACING.md, gap: SPACING.md },
  prefillBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', padding: 12, borderRadius: RADIUS.lg },
  prefillBannerText: { fontSize: 13, fontWeight: '700', color: '#059669' },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md, gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 4 },
  input: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 10 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  pillTextActive: { color: '#fff' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: 14, marginTop: 4, ...SHADOWS.md },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});