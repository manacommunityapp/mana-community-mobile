import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  InsuranceScreen, StateView, DisclosureBanner, Card, Button, Field,
} from '@/components/insurance/InsuranceUI';
import { insuranceService } from '@/services/insuranceService';
import { THEME } from '@/constants/theme';
import { FONTS, RADIUS } from '@/constants/config';
import type { ClaimCaseView } from '@/types/insurance';

const ASSISTANCE_STATUS_LABEL: Record<ClaimCaseView['assistanceStatus'], string> = {
  OPEN:           'Open',
  IN_REVIEW:      'In review by Mana',
  AWAITING_USER:  'Awaiting your action',
  CLOSED:         'Closed',
};

const ASSISTANCE_STATUS_COLOR: Record<ClaimCaseView['assistanceStatus'], { bg: string; text: string }> = {
  OPEN:          { bg: '#DBEAFE', text: '#1D4ED8' },
  IN_REVIEW:     { bg: '#FEF3C7', text: '#D97706' },
  AWAITING_USER: { bg: '#FEE2E2', text: '#DC2626' },
  CLOSED:        { bg: '#F1F5F9', text: '#64748B' },
};

export default function ClaimsScreen() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [claimType, setClaimType] = useState('');
  const [description, setDescription] = useState('');
  const [formErr, setFormErr] = useState<Record<string, string>>({});

  const casesQ = useQuery({
    queryKey: ['insurance-claims'],
    queryFn: insuranceService.claimCases,
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: () => insuranceService.createClaimCase({ claimType, description: description || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurance-claims'] });
      setShowForm(false);
      setClaimType('');
      setDescription('');
      setFormErr({});
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    if (!claimType.trim()) e.claimType = 'Please describe the type of claim';
    setFormErr(e);
    if (Object.keys(e).length) return;
    createMut.mutate();
  }

  return (
    <InsuranceScreen title="Claims Assistance">
      <DisclosureBanner extra="Mana helps you track and document your claim. The claim decision is made entirely by your insurer, not by Mana." />

      <View style={s.noticeBanner} accessibilityRole="alert">
        <Text style={s.noticeText}>
          ⚠️ Mana Community provides administrative assistance only. We do not decide, approve or reject insurance
          claims. All claim decisions are made by the insurer or its authorised claims handler.
        </Text>
      </View>

      {!showForm && (
        <Button label="+ Open Assistance Case" onPress={() => setShowForm(true)} />
      )}

      {showForm && (
        <Card>
          <Text style={s.formTitle}>Open Assistance Case</Text>
          <Field
            label="Claim type *"
            value={claimType}
            onChangeText={setClaimType}
            placeholder="e.g. Cashless hospitalisation, reimbursement"
            error={formErr.claimType}
          />
          <Field
            label="Additional details (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your situation"
            multiline
            numberOfLines={3}
          />
          <View style={s.btns}>
            <Button label="Cancel" variant="secondary" onPress={() => { setShowForm(false); setFormErr({}); }} />
            <Button label="Submit" onPress={submit} loading={createMut.isPending} />
          </View>
          {createMut.isError && <Text style={s.err}>Failed to open case. Please try again.</Text>}
        </Card>
      )}

      {casesQ.isLoading ? (
        <StateView kind="loading" />
      ) : casesQ.isError ? (
        <StateView kind="error" onRetry={() => casesQ.refetch()} />
      ) : !casesQ.data?.length ? (
        <StateView kind="empty" title="No cases yet" message="Open an assistance case if you need help with a claim." />
      ) : (
        casesQ.data.map((c) => {
          const sc = ASSISTANCE_STATUS_COLOR[c.assistanceStatus];
          return (
            <Card key={c.id}>
              <View style={s.caseHeader}>
                <Text style={s.caseRef}>Case {c.caseRef}</Text>
                <View style={[s.statusChip, { backgroundColor: sc.bg }]}>
                  <Text style={[s.statusText, { color: sc.text }]}>{ASSISTANCE_STATUS_LABEL[c.assistanceStatus]}</Text>
                </View>
              </View>
              <Text style={s.caseType}>{c.claimType}</Text>
              {!!c.description && <Text style={s.caseDesc}>{c.description}</Text>}
              {!!c.insurerClaimReference && (
                <Text style={s.caseRef2}>
                  Insurer reference: {c.insurerClaimReference}
                  {c.insurerClaimReferenceSource ? ` (${c.insurerClaimReferenceSource})` : ''}
                </Text>
              )}
              {!!c.assignedTeam && <Text style={s.caseMeta}>Handled by: {c.assignedTeam}</Text>}
              <Text style={s.caseMeta}>Opened: {new Date(c.createdAt).toLocaleDateString('en-IN')}</Text>
              <Text style={s.caseNotice}>{c.notice}</Text>
            </Card>
          );
        })
      )}
    </InsuranceScreen>
  );
}

const s = StyleSheet.create({
  noticeBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  noticeText: { fontFamily: FONTS.regular, fontSize: 13, color: '#92400E', lineHeight: 18 },
  formTitle: { fontFamily: FONTS.displaySemi, fontSize: 15, color: THEME.textPrimary, marginBottom: 12 },
  btns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  err: { color: THEME.lossDark, fontFamily: FONTS.regular, fontSize: 12, marginTop: 8 },
  caseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  caseRef: { fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.textPrimary },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontFamily: FONTS.semiBold, fontSize: 11 },
  caseType: { fontFamily: FONTS.regular, fontSize: 13, color: THEME.textPrimary, marginBottom: 4 },
  caseDesc: { fontFamily: FONTS.regular, fontSize: 12, color: THEME.textSecondary, marginBottom: 4 },
  caseRef2: { fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.brand, marginBottom: 4 },
  caseMeta: { fontFamily: FONTS.regular, fontSize: 11, color: THEME.textMuted },
  caseNotice: { fontFamily: FONTS.regular, fontSize: 11, color: THEME.textSecondary, marginTop: 6, fontStyle: 'italic' },
});