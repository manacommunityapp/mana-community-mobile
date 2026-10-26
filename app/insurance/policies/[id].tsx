import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  InsuranceScreen, StateView, DisclosureBanner, Card, Button,
} from '@/components/insurance/InsuranceUI';
import { insuranceService } from '@/services/insuranceService';
import { maskPolicyNumber, daysUntil, categoryLabel } from '@/constants/insurance';
import { THEME } from '@/constants/theme';
import { FONTS } from '@/constants/config';

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{String(value)}</Text>
    </View>
  );
}

export default function PolicyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const policyId = Number(id);

  const q = useQuery({
    queryKey: ['insurance-policy', policyId],
    queryFn: () => insuranceService.policy(policyId),
    enabled: !isNaN(policyId),
    staleTime: 60_000,
  });

  const deleteMut = useMutation({
    mutationFn: () => insuranceService.deletePolicy(policyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurance-policies'] });
      router.back();
    },
  });

  function confirmDelete() {
    Alert.alert(
      'Remove policy?',
      'This removes the self-declared record from Mana. Your actual insurance policy with the insurer is not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteMut.mutate() },
      ],
    );
  }

  if (q.isLoading) {
    return <InsuranceScreen title="Policy Details"><StateView kind="loading" /></InsuranceScreen>;
  }
  if (q.isError || !q.data) {
    return <InsuranceScreen title="Policy Details"><StateView kind="error" onRetry={() => q.refetch()} /></InsuranceScreen>;
  }

  const p = q.data;
  const days = daysUntil(p.expiryDate);
  const expiryDisplay = p.expiryDate
    ? `${p.expiryDate}${days !== null ? ` (${days >= 0 ? `${days}d remaining` : 'expired'})` : ''}`
    : undefined;

  return (
    <InsuranceScreen title={p.productName}>
      <DisclosureBanner
        extra={p.coverageConfirmedByInsurer ? undefined : 'Coverage status has NOT been confirmed by the insurer.'}
      />

      {p.dataSource === 'USER_DECLARED' && (
        <View style={s.declarationBanner}>
          <Text style={s.declarationText}>
            Self-declared policy — not verified by the insurer. {p.statusNote}
          </Text>
        </View>
      )}

      <Card>
        <Row label="Insurer"         value={p.insurerName} />
        <Row label="Product"         value={p.productName} />
        <Row label="Category"        value={categoryLabel(p.category)} />
        <Row label="Policy number"   value={maskPolicyNumber(p.maskedPolicyNumber)} />
        <Row label="Status"          value={p.status} />
        <Row label="Start date"      value={p.startDate} />
        <Row label="Expiry date"     value={expiryDisplay} />
        <Row label="Sum insured"     value={p.sumInsured != null ? `₹${p.sumInsured.toLocaleString('en-IN')}` : undefined} />
        <Row label="Premium"         value={p.premiumAmount != null ? `₹${p.premiumAmount.toLocaleString('en-IN')} ${p.premiumFrequency ?? ''}`.trim() : undefined} />
        <Row label="Nominee"         value={p.nomineeName} />
        <Row label="Insurer contact" value={p.insurerContact} />
        <Row label="Data source"     value={p.dataSource === 'USER_DECLARED' ? 'Self-declared' : 'Partner-verified'} />
      </Card>

      <Button
        label="Get Claims Assistance"
        variant="secondary"
        onPress={() => router.push('/insurance/claims' as any)}
      />
      <View style={{ height: 12 }} />
      <Button
        label="Remove from Mana"
        variant="danger"
        onPress={confirmDelete}
        loading={deleteMut.isPending}
      />
      {deleteMut.isError && (
        <Text style={s.err}>Failed to remove. Please try again.</Text>
      )}
    </InsuranceScreen>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  rowLabel: { fontFamily: FONTS.regular, fontSize: 13, color: THEME.textSecondary, flex: 1 },
  rowValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.textPrimary, flex: 1, textAlign: 'right' },
  declarationBanner: {
    backgroundColor: THEME.amberLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.amber,
  },
  declarationText: { fontFamily: FONTS.regular, fontSize: 13, color: '#92400E' },
  err: { color: THEME.lossDark, fontFamily: FONTS.regular, fontSize: 12, marginTop: 8 },
});