import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  InsuranceScreen, StateView, DisclosureBanner, Card, Button, Field, ValidationSummary,
} from '@/components/insurance/InsuranceUI';
import { insuranceService } from '@/services/insuranceService';
import { INSURANCE_NOTICE_VERSION } from '@/constants/insurance';
import { THEME } from '@/constants/theme';
import { FONTS, RADIUS } from '@/constants/config';
import type { GroupEnquiryInput } from '@/types/insurance';

const COVERAGE_SCOPES: Array<{ key: GroupEnquiryInput['coverageScope']; label: string }> = [
  { key: 'COMMON_PROPERTY',     label: 'Common property' },
  { key: 'INDIVIDUAL_RESIDENT', label: 'Individual residents' },
  { key: 'GROUP_POLICY',        label: 'Group policy' },
];

export default function GroupEnquiryScreen() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<GroupEnquiryInput>>({ contactMethod: 'EMAIL' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consentGranted, setConsentGranted] = useState(false);

  const enquiriesQ = useQuery({
    queryKey: ['insurance-group-enquiries'],
    queryFn: insuranceService.groupEnquiries,
    staleTime: 60_000,
  });

  const consentMut = useMutation({
    mutationFn: () => insuranceService.grantConsent('GROUP_ENQUIRY', INSURANCE_NOTICE_VERSION),
  });

  const enquiryMut = useMutation({
    mutationFn: (input: GroupEnquiryInput) => insuranceService.createGroupEnquiry(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurance-group-enquiries'] });
      setShowForm(false);
      setForm({ contactMethod: 'EMAIL' });
      setConsentGranted(false);
      setErrors({});
    },
  });

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.organisationName?.trim()) e.organisationName = 'Organisation name is required';
    if (!form.organisationType?.trim()) e.organisationType = 'Organisation type is required';
    if (!form.coverageScope) e.coverageScope = 'Coverage scope is required';
    if (!form.coverageSought?.trim()) e.coverageSought = 'Coverage sought is required';
    if (!form.approxMembers || form.approxMembers < 5) e.approxMembers = 'Minimum 5 members';
    if (!consentGranted) e.consent = 'You must consent to share group enquiry details';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function submit() {
    if (!validate()) return;
    try {
      const consent = await consentMut.mutateAsync();
      enquiryMut.mutate({ ...(form as GroupEnquiryInput), consentId: consent.id });
    } catch {
      // consentMut error shown via isError
    }
  }

  return (
    <InsuranceScreen title="Group Enquiry">
      <DisclosureBanner extra="Group enquiries are submitted to our team. A representative will contact your community management." />

      <View style={s.notice} accessibilityRole="summary">
        <Text style={s.noticeText}>
          Mana facilitates group insurance enquiries on behalf of your community. We do not underwrite or sell
          insurance. Quotes and terms are provided by registered insurers only.
        </Text>
      </View>

      {!showForm && <Button label="+ Submit Group Enquiry" onPress={() => setShowForm(true)} />}

      {showForm && (
        <Card>
          <ValidationSummary errors={errors} />
          <Field
            label="Organisation / community name *"
            value={form.organisationName ?? ''}
            onChangeText={(v) => setForm({ ...form, organisationName: v })}
            error={errors.organisationName}
            placeholder="e.g. Sunshine Residency"
          />
          <Field
            label="Organisation type *"
            value={form.organisationType ?? ''}
            onChangeText={(v) => setForm({ ...form, organisationType: v })}
            error={errors.organisationType}
            placeholder="e.g. RWA, Housing Society"
          />

          <Text style={s.fieldLabel}>Coverage scope *</Text>
          <View style={s.chips}>
            {COVERAGE_SCOPES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[s.chip, form.coverageScope === key && s.chipActive]}
                onPress={() => setForm({ ...form, coverageScope: key })}
              >
                <Text style={[s.chipText, form.coverageScope === key && s.chipActiveText]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!errors.coverageScope && <Text style={s.err}>{errors.coverageScope}</Text>}

          <Field
            label="Coverage sought *"
            value={form.coverageSought ?? ''}
            onChangeText={(v) => setForm({ ...form, coverageSought: v })}
            error={errors.coverageSought}
            placeholder="e.g. Fire and allied perils, group health"
          />
          <Field
            label="Approx. members *"
            value={form.approxMembers ? String(form.approxMembers) : ''}
            onChangeText={(v) => setForm({ ...form, approxMembers: parseInt(v) || 0 })}
            error={errors.approxMembers}
            keyboardType="numeric"
            placeholder="Minimum 5"
          />
          <Field
            label="Additional requirements"
            value={form.requirements ?? ''}
            onChangeText={(v) => setForm({ ...form, requirements: v })}
            placeholder="Optional"
            multiline
            numberOfLines={3}
          />

          <Text style={s.fieldLabel}>Preferred contact method</Text>
          <View style={s.chips}>
            {(['EMAIL', 'PHONE'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[s.chip, form.contactMethod === m && s.chipActive]}
                onPress={() => setForm({ ...form, contactMethod: m })}
              >
                <Text style={[s.chipText, form.contactMethod === m && s.chipActiveText]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Explicit consent checkbox */}
          <TouchableOpacity
            style={s.consentRow}
            onPress={() => setConsentGranted((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consentGranted }}
          >
            <View style={[s.checkbox, consentGranted && s.checkboxChecked]}>
              {consentGranted && <Text style={s.checkmark}>✓</Text>}
            </View>
            <Text style={s.consentLabel}>
              I consent to Mana sharing this group enquiry with registered insurance partners to obtain quotes.
              I understand this is not a binding application.
            </Text>
          </TouchableOpacity>
          {!!errors.consent && <Text style={s.err}>{errors.consent}</Text>}

          <View style={s.btns}>
            <Button label="Cancel" variant="secondary" onPress={() => { setShowForm(false); setErrors({}); }} />
            <Button label="Submit" onPress={submit} loading={enquiryMut.isPending || consentMut.isPending} />
          </View>
          {(enquiryMut.isError || consentMut.isError) && (
            <Text style={s.err}>Failed to submit. Please try again.</Text>
          )}
        </Card>
      )}

      {enquiriesQ.isLoading ? (
        <StateView kind="loading" />
      ) : enquiriesQ.isError ? (
        <StateView kind="error" onRetry={() => enquiriesQ.refetch()} />
      ) : !enquiriesQ.data?.length ? (
        <StateView kind="empty" title="No enquiries yet" message="Submit a group enquiry for your community." />
      ) : (
        enquiriesQ.data.map((e) => (
          <Card key={e.id}>
            <Text style={s.enqRef}>Ref: {e.enquiryRef}</Text>
            <Text style={s.enqOrg}>{e.organisationName} — {e.organisationType}</Text>
            <Text style={s.enqStatus}>Status: {e.status}</Text>
            <Text style={s.enqMeta}>{e.coverageSought} · {e.approxMembers} members</Text>
            <Text style={s.enqNotice}>{e.notice}</Text>
          </Card>
        ))
      )}
    </InsuranceScreen>
  );
}

const s = StyleSheet.create({
  notice: { backgroundColor: THEME.indigoLight, borderRadius: 8, padding: 12, marginBottom: 12 },
  noticeText: { fontFamily: FONTS.regular, fontSize: 13, color: THEME.textPrimary, lineHeight: 18 },
  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.textPrimary, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: THEME.surfaceMuted, borderWidth: 1, borderColor: THEME.border },
  chipActive: { backgroundColor: THEME.brand, borderColor: THEME.brand },
  chipText: { fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.textPrimary },
  chipActiveText: { color: '#fff' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: THEME.brand, borderColor: THEME.brand },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  consentLabel: { flex: 1, fontFamily: FONTS.regular, fontSize: 12, color: THEME.textSecondary, lineHeight: 17 },
  err: { color: THEME.lossDark, fontFamily: FONTS.regular, fontSize: 12, marginBottom: 8 },
  btns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  enqRef: { fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.textSecondary, marginBottom: 4 },
  enqOrg: { fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.textPrimary, marginBottom: 2 },
  enqStatus: { fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.brand, marginBottom: 2 },
  enqMeta: { fontFamily: FONTS.regular, fontSize: 12, color: THEME.textSecondary, marginBottom: 4 },
  enqNotice: { fontFamily: FONTS.regular, fontSize: 11, color: THEME.textMuted, fontStyle: 'italic' },
});