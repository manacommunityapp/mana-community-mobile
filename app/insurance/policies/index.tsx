import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  InsuranceScreen, StateView, DisclosureBanner, Card, Button, Field, ValidationSummary,
} from '@/components/insurance/InsuranceUI';
import { insuranceService } from '@/services/insuranceService';
import { maskPolicyNumber, renewalBucket, categoryLabel, CATEGORIES } from '@/constants/insurance';
import { THEME } from '@/constants/theme';
import { FONTS, RADIUS } from '@/constants/config';
import type { PolicyView, PolicyCreateInput, InsuranceCategory } from '@/types/insurance';

type BucketKey = 'OVERDUE' | 'DUE_30' | 'DUE_60' | 'LATER' | 'UNKNOWN';
const BUCKET: Record<BucketKey, { bg: string; text: string; label: string }> = {
  OVERDUE: { bg: '#FEE2E2', text: '#DC2626', label: 'Overdue' },
  DUE_30:  { bg: '#FEF3C7', text: '#D97706', label: 'Due in 30d' },
  DUE_60:  { bg: '#FEF9C3', text: '#CA8A04', label: 'Due in 60d' },
  LATER:   { bg: '#DCFCE7', text: '#059669', label: 'Active' },
  UNKNOWN: { bg: '#F1F5F9', text: '#64748B', label: 'Unknown' },
};

export default function PoliciesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<PolicyCreateInput>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const policiesQ = useQuery({
    queryKey: ['insurance-policies'],
    queryFn: insuranceService.policies,
    staleTime: 60_000,
  });

  const addMut = useMutation({
    mutationFn: insuranceService.createPolicy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurance-policies'] });
      setShowForm(false);
      setForm({});
      setErrors({});
    },
  });

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.insurerName?.trim()) e.insurerName = 'Insurer name is required';
    if (!form.productName?.trim()) e.productName = 'Product name is required';
    if (!form.category) e.category = 'Category is required';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function submit() {
    if (!validate()) return;
    addMut.mutate(form as PolicyCreateInput);
  }

  return (
    <InsuranceScreen title="My Policies">
      <DisclosureBanner extra="Policies you add here are self-declared. Coverage status is confirmed only by the insurer." />

      {!showForm && (
        <Button label="+ Track a Policy" onPress={() => setShowForm(true)} />
      )}

      {showForm && (
        <Card>
          <Text style={s.formTitle}>Track a Policy</Text>
          <ValidationSummary errors={errors} />
          <Field
            label="Insurer Name *"
            value={form.insurerName ?? ''}
            onChangeText={(v) => setForm({ ...form, insurerName: v })}
            error={errors.insurerName}
            placeholder="e.g. Star Health"
          />
          <Field
            label="Product Name *"
            value={form.productName ?? ''}
            onChangeText={(v) => setForm({ ...form, productName: v })}
            error={errors.productName}
            placeholder="e.g. Family Health Optima"
          />
          <Text style={s.fieldLabel}>Category *</Text>
          <View style={s.catPicker}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.key}
                style={[s.catChip, form.category === c.key && s.catChipActive]}
                onPress={() => setForm({ ...form, category: c.key as InsuranceCategory })}
              >
                <Text style={[s.catChipText, form.category === c.key && s.catChipActiveText]} numberOfLines={1}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!errors.category && <Text style={s.err}>{errors.category}</Text>}
          <Field
            label="Policy Number (optional)"
            value={form.policyNumber ?? ''}
            onChangeText={(v) => setForm({ ...form, policyNumber: v })}
            placeholder="Will be masked for security"
          />
          <Field
            label="Start Date (YYYY-MM-DD)"
            value={form.startDate ?? ''}
            onChangeText={(v) => setForm({ ...form, startDate: v })}
            placeholder="2024-01-01"
          />
          <Field
            label="Expiry Date (YYYY-MM-DD)"
            value={form.expiryDate ?? ''}
            onChangeText={(v) => setForm({ ...form, expiryDate: v })}
            placeholder="2025-01-01"
          />
          <View style={s.formBtns}>
            <Button label="Cancel" variant="secondary" onPress={() => { setShowForm(false); setErrors({}); }} />
            <Button label="Save Policy" onPress={submit} loading={addMut.isPending} />
          </View>
          {addMut.isError && <Text style={s.err}>Failed to save. Please try again.</Text>}
        </Card>
      )}

      {policiesQ.isLoading ? (
        <StateView kind="loading" />
      ) : policiesQ.isError ? (
        <StateView kind="error" onRetry={() => policiesQ.refetch()} />
      ) : !policiesQ.data?.length ? (
        <StateView
          kind="empty"
          title="No policies yet"
          message="Track your insurance policies here to monitor renewal dates and get claims support."
        />
      ) : (
        policiesQ.data.map((p) => {
          const bucket = renewalBucket(p) as BucketKey;
          const bs = BUCKET[bucket];
          return (
            <TouchableOpacity key={p.id} onPress={() => router.push(`/insurance/policies/${p.id}` as any)} activeOpacity={0.8}>
              <Card>
                <View style={s.pRow}>
                  <View style={s.pInfo}>
                    <Text style={s.pName}>{p.productName}</Text>
                    <Text style={s.pInsurer}>{p.insurerName} · {categoryLabel(p.category)}</Text>
                    <Text style={s.pNum}>{maskPolicyNumber(p.maskedPolicyNumber)}</Text>
                  </View>
                  <View style={[s.bucket, { backgroundColor: bs.bg }]}>
                    <Text style={[s.bucketTxt, { color: bs.text }]}>{bs.label}</Text>
                  </View>
                </View>
                {p.dataSource === 'USER_DECLARED' && (
                  <Text style={s.declarationNote}>Self-declared — coverage not confirmed by insurer</Text>
                )}
              </Card>
            </TouchableOpacity>
          );
        })
      )}
    </InsuranceScreen>
  );
}

const s = StyleSheet.create({
  formTitle: { fontFamily: FONTS.displaySemi, fontSize: 15, color: THEME.textPrimary, marginBottom: 12 },
  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.textPrimary, marginBottom: 6 },
  catPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  catChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: THEME.surfaceMuted, borderWidth: 1, borderColor: THEME.border },
  catChipActive: { backgroundColor: THEME.brand, borderColor: THEME.brand },
  catChipText: { fontFamily: FONTS.semiBold, fontSize: 11, color: THEME.textPrimary },
  catChipActiveText: { color: '#fff' },
  err: { color: THEME.lossDark, fontFamily: FONTS.regular, fontSize: 12, marginTop: 4 },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pInfo: { flex: 1 },
  pName: { fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.textPrimary },
  pInsurer: { fontFamily: FONTS.regular, fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  pNum: { fontFamily: FONTS.regular, fontSize: 11, color: THEME.textMuted, marginTop: 2 },
  bucket: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  bucketTxt: { fontFamily: FONTS.semiBold, fontSize: 11 },
  declarationNote: { fontFamily: FONTS.regular, fontSize: 11, color: THEME.textMuted, marginTop: 6, fontStyle: 'italic' },
});