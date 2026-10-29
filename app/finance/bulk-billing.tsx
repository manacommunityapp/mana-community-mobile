import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { THEME, FONTS, SHADOWS } from '@/constants/config';
import { financeExtService, BulkBillingResult } from '@/services/financeExtService';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function BulkBillingScreen() {
  const router = useRouter();
  const [billingMonth, setBillingMonth] = useState(currentMonth());
  const [maintenancePerSqft, setMaintenancePerSqft] = useState('');
  const [sinkingFund, setSinkingFund] = useState('');
  const [waterCharges, setWaterCharges] = useState('');
  const [dgCharges, setDgCharges] = useState('');
  const [applyGst, setApplyGst] = useState(false);
  const [dueInDays, setDueInDays] = useState('15');
  const [result, setResult] = useState<BulkBillingResult | null>(null);
  const [error, setError] = useState('');

  const generateMutation = useMutation({
    mutationFn: () =>
      financeExtService.generateBulkInvoices({
        billingMonth,
        maintenancePerSqft: parseFloat(maintenancePerSqft) || 0,
        sinkingFund: parseFloat(sinkingFund) || 0,
        waterChargesPerUnit: parseFloat(waterCharges) || 0,
        dgCharges: parseFloat(dgCharges) || 0,
        applyGst,
        dueInDays: parseInt(dueInDays, 10) || 15,
      }),
    onSuccess: (data) => {
      setResult(data);
      setError('');
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to generate invoices. Please try again.');
    },
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Bulk Billing</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.sectionTitle}>Monthly Billing Engine</Text>
          <Text style={s.sectionSub}>Generate invoices for all active units in one click.</Text>

          <View style={s.field}>
            <Text style={s.label}>Billing Month (YYYY-MM)</Text>
            <TextInput
              style={s.input}
              value={billingMonth}
              onChangeText={setBillingMonth}
              placeholder="e.g. 2026-11"
              placeholderTextColor={THEME.textMuted}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Maintenance (₹ / sq.ft)</Text>
            <TextInput
              style={s.input}
              value={maintenancePerSqft}
              onChangeText={setMaintenancePerSqft}
              placeholder="e.g. 2.50"
              placeholderTextColor={THEME.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Sinking Fund (₹ / flat)</Text>
            <TextInput
              style={s.input}
              value={sinkingFund}
              onChangeText={setSinkingFund}
              placeholder="e.g. 500"
              placeholderTextColor={THEME.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Water Charges (₹ / unit)</Text>
            <TextInput
              style={s.input}
              value={waterCharges}
              onChangeText={setWaterCharges}
              placeholder="e.g. 200"
              placeholderTextColor={THEME.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>DG Charges (₹ / flat)</Text>
            <TextInput
              style={s.input}
              value={dgCharges}
              onChangeText={setDgCharges}
              placeholder="e.g. 300"
              placeholderTextColor={THEME.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Due In (days)</Text>
            <TextInput
              style={s.input}
              value={dueInDays}
              onChangeText={setDueInDays}
              placeholder="15"
              placeholderTextColor={THEME.textMuted}
              keyboardType="number-pad"
            />
          </View>

          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Apply 18% GST</Text>
              <Text style={s.switchSub}>Applicable if monthly dues exceed ₹7,500</Text>
            </View>
            <Switch
              value={applyGst}
              onValueChange={setApplyGst}
              trackColor={{ false: THEME.border, true: THEME.brand }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {error ? (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={THEME.lossDark} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {result ? (
          <View style={s.successCard}>
            <Text style={s.successIcon}>✅</Text>
            <Text style={s.successTitle}>
              {result.generatedCount} invoices generated
            </Text>
            <Text style={s.successAmount}>
              Total: ₹{result.totalAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={s.successMonth}>Billing Month: {result.billingMonth}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[s.generateBtn, generateMutation.isPending && s.generateBtnDisabled]}
          onPress={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          activeOpacity={0.85}
        >
          {generateMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="flash" size={18} color="#FFFFFF" />
              <Text style={s.generateBtnText}>Generate Invoices</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  content: { padding: 16, gap: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    gap: 14,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  sectionSub: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
    marginTop: -8,
  },
  field: { gap: 6 },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  input: {
    backgroundColor: THEME.surfaceMuted,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 14,
    color: THEME.textPrimary,
    fontFamily: FONTS.regular,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  switchSub: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.lossLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.lossBorder,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: THEME.lossDark,
    fontFamily: FONTS.medium,
  },
  successCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  successIcon: { fontSize: 32 },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.brandDark,
    fontFamily: FONTS.displayBold,
    marginTop: 4,
  },
  successAmount: {
    fontSize: 13,
    color: THEME.brandDark,
    fontFamily: FONTS.semiBold,
  },
  successMonth: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.brand,
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 4,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
});
