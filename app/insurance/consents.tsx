import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  InsuranceScreen, StateView, DisclosureBanner, Card, Button,
} from '@/components/insurance/InsuranceUI';
import { insuranceService } from '@/services/insuranceService';
import { THEME } from '@/constants/theme';
import { FONTS } from '@/constants/config';
import type { ConsentView } from '@/types/insurance';

const PURPOSE_LABELS: Record<string, string> = {
  QUOTE_SHARING:     'Share details for quotes',
  POLICY_STORAGE:    'Store policy in Mana Vault',
  CLAIMS_ASSISTANCE: 'Claims assistance',
  GROUP_ENQUIRY:     'Group insurance enquiry',
  MARKETING:         'Insurance offers & updates',
};

export default function ConsentsScreen() {
  const qc = useQueryClient();
  const consentsQ = useQuery({
    queryKey: ['insurance-consents'],
    queryFn: insuranceService.consents,
    staleTime: 60_000,
  });

  const withdrawMut = useMutation({
    mutationFn: (id: number) => insuranceService.withdrawConsent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance-consents'] }),
  });

  // Group by purpose: keep only the latest event per purpose (append-only log)
  const latestByPurpose = new Map<string, ConsentView>();
  (consentsQ.data ?? []).forEach((c) => {
    const existing = latestByPurpose.get(c.purpose);
    if (!existing || c.id > existing.id) latestByPurpose.set(c.purpose, c);
  });
  const entries = [...latestByPurpose.values()].sort((a, b) => b.id - a.id);

  return (
    <InsuranceScreen title="My Consents">
      <DisclosureBanner />

      <Text style={s.intro}>
        Mana records your consent for each data-sharing activity. You may withdraw consent at any time.
        Withdrawal affects future data sharing; past activities that relied on prior consent are logged in our audit trail.
      </Text>

      {consentsQ.isLoading ? (
        <StateView kind="loading" />
      ) : consentsQ.isError ? (
        <StateView kind="error" onRetry={() => consentsQ.refetch()} />
      ) : !entries.length ? (
        <StateView
          kind="empty"
          title="No consents recorded"
          message="Consent records appear here when you use insurance features."
        />
      ) : (
        entries.map((c) => (
          <Card key={c.id}>
            <View style={s.row}>
              <View style={s.info}>
                <Text style={s.purpose}>{PURPOSE_LABELS[c.purpose] ?? c.purpose}</Text>
                <Text style={s.meta}>
                  {c.eventType === 'GRANTED' ? '✅ Granted' : '🚫 Withdrawn'} · Notice {c.noticeVersion}
                </Text>
                <Text style={s.date}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</Text>
              </View>
              {c.eventType === 'GRANTED' && (
                <Button
                  label="Withdraw"
                  variant="danger"
                  onPress={() => withdrawMut.mutate(c.id)}
                  loading={withdrawMut.isPending}
                />
              )}
            </View>
          </Card>
        ))
      )}
    </InsuranceScreen>
  );
}

const s = StyleSheet.create({
  intro: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { flex: 1 },
  purpose: { fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.textPrimary, marginBottom: 2 },
  meta: { fontFamily: FONTS.regular, fontSize: 12, color: THEME.textSecondary, marginBottom: 2 },
  date: { fontFamily: FONTS.regular, fontSize: 11, color: THEME.textMuted },
});