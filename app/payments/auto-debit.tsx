import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { autoDebitService, BankMandate, SetupMandateRequest, AutoDebitStatus } from '@/services/autoDebitService';

const STATUS_META: Record<AutoDebitStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:               { label: 'Active',               color: '#059669', bg: '#D1FAE5' },
  PENDING_VERIFICATION: { label: 'Pending Verification',  color: '#D97706', bg: '#FEF3C7' },
  INACTIVE:             { label: 'Inactive',              color: '#6B7280', bg: '#F3F4F6' },
  CANCELLED:            { label: 'Cancelled',             color: '#DC2626', bg: '#FEE2E2' },
};

const BLANK: SetupMandateRequest = {
  bankName: '', accountNumber: '', ifsc: '', accountHolderName: '', monthlyAmount: 2500,
};

function maskAccount(raw: string): string {
  if (raw.length <= 4) return raw;
  return 'X'.repeat(raw.length - 4) + raw.slice(-4);
}

export default function AutoDebitScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SetupMandateRequest>({ ...BLANK });
  const [agreed, setAgreed] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const { data: mandate, isLoading } = useQuery<BankMandate | null>({
    queryKey: ['payments', 'auto-debit'],
    queryFn: () => autoDebitService.getMyMandate(),
    staleTime: 60_000,
  });

  const setupMutation = useMutation({
    mutationFn: (data: SetupMandateRequest) => autoDebitService.setupMandate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'auto-debit'] });
      Alert.alert('Auto-Pay Active', 'Your auto-debit mandate has been set up. You will receive a confirmation SMS.');
    },
    onError: (err: any) => Alert.alert('Setup Failed', err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => autoDebitService.cancelMandate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'auto-debit'] });
      Alert.alert('Cancelled', 'Auto-Pay has been cancelled. It may take up to 3 working days to process.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const handleSetup = () => {
    if (!form.bankName.trim() || !form.accountNumber.trim() || !form.ifsc.trim() || !form.accountHolderName.trim()) {
      Alert.alert('Missing Info', 'Please fill in all required fields.');
      return;
    }
    if (!agreed) {
      Alert.alert('Authorization Required', 'Please agree to the auto-debit terms to continue.');
      return;
    }
    setupMutation.mutate(form);
  };

  const handleCancel = () => {
    if (!mandate) return;
    Alert.alert(
      'Cancel Auto-Pay?',
      'This will stop future automatic deductions. Cancellation takes 3 working days. Continue?',
      [
        { text: 'Keep Auto-Pay', style: 'cancel' },
        { text: 'Cancel Auto-Pay', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Auto-Pay Setup</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.center}><ActivityIndicator size="large" color="#059669" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Auto-Pay Setup</Text>
          <Text style={s.headerSub}>Never miss your maintenance payment</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {mandate && (mandate.status === 'ACTIVE' || mandate.status === 'PENDING_VERIFICATION') ? (
          /* ── STATE B: ACTIVE MANDATE ── */
          <>
            <View style={s.activeBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={s.activeBannerText}>Auto-Pay is set up</Text>
            </View>

            <View style={s.mandateCard}>
              <View style={s.mandateRow}>
                <Ionicons name="business-outline" size={16} color={COLORS.textMuted} />
                <Text style={s.mandateLabel}>Bank</Text>
                <Text style={s.mandateValue}>{mandate.bankName}</Text>
              </View>
              <View style={s.mandateRow}>
                <Ionicons name="card-outline" size={16} color={COLORS.textMuted} />
                <Text style={s.mandateLabel}>Account</Text>
                <Text style={s.mandateValue}>XXXX {mandate.accountLast4}</Text>
              </View>
              <View style={s.mandateRow}>
                <Ionicons name="document-text-outline" size={16} color={COLORS.textMuted} />
                <Text style={s.mandateLabel}>Mandate Ref</Text>
                <Text style={s.mandateValue}>{mandate.mandateRef}</Text>
              </View>
              <View style={s.mandateRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textMuted} />
                <Text style={s.mandateLabel}>Status</Text>
                <View style={[s.statusBadge, { backgroundColor: STATUS_META[mandate.status].bg }]}>
                  <Text style={[s.statusText, { color: STATUS_META[mandate.status].color }]}>
                    {STATUS_META[mandate.status].label}
                  </Text>
                </View>
              </View>
              <View style={[s.mandateRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="cash-outline" size={16} color={COLORS.textMuted} />
                <Text style={s.mandateLabel}>Monthly</Text>
                <Text style={[s.mandateValue, { color: '#059669', fontFamily: 'Outfit-Bold', fontWeight: '700' }]}>
                  ₹{mandate.monthlyAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {mandate.nextDebitDate && (
              <View style={s.upcomingCard}>
                <View style={s.upcomingLeft}>
                  <Ionicons name="calendar-outline" size={18} color="#059669" />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={s.upcomingTitle}>Upcoming Debit</Text>
                  <Text style={s.upcomingDate}>
                    {new Date(mandate.nextDebitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={s.upcomingAmount}>₹{mandate.monthlyAmount.toLocaleString('en-IN')}</Text>
              </View>
            )}

            <View style={s.cancelNote}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
              <Text style={s.cancelNoteText}>Cancellation takes up to 3 working days to process.</Text>
            </View>

            <TouchableOpacity
              style={[s.cancelBtn, cancelMutation.isPending && { opacity: 0.7 }]}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending
                ? <ActivityIndicator size="small" color="#DC2626" />
                : <Text style={s.cancelBtnText}>Cancel Auto-Pay</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          /* ── STATE A: NO MANDATE ── */
          <>
            <View style={s.infoCard}>
              <Text style={s.infoTitle}>Never miss a payment again</Text>
              {[
                'Auto-debits on the 5th of each month',
                'Email receipt sent immediately after debit',
                'No late fees or penalties',
                'Cancel anytime from this screen',
              ].map((pt, i) => (
                <View key={i} style={s.bullet}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={s.bulletText}>{pt}</Text>
                </View>
              ))}
            </View>

            <Text style={s.sectionTitle}>Bank Details</Text>

            <Text style={s.label}>Bank Name *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. HDFC Bank, SBI, ICICI"
              placeholderTextColor={COLORS.textMuted}
              value={form.bankName}
              onChangeText={v => setForm(f => ({ ...f, bankName: v }))}
            />

            <Text style={s.label}>Account Number *</Text>
            <View style={s.inputRow}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Enter account number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                secureTextEntry={!showRaw}
                value={form.accountNumber}
                onChangeText={v => setForm(f => ({ ...f, accountNumber: v }))}
              />
              <TouchableOpacity onPress={() => setShowRaw(r => !r)} style={s.eyeBtn} hitSlop={8}>
                <Ionicons name={showRaw ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={s.label}>IFSC Code *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. HDFC0001234"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              value={form.ifsc}
              onChangeText={v => setForm(f => ({ ...f, ifsc: v.toUpperCase() }))}
            />

            <Text style={s.label}>Account Holder Name *</Text>
            <TextInput
              style={s.input}
              placeholder="As on bank records"
              placeholderTextColor={COLORS.textMuted}
              value={form.accountHolderName}
              onChangeText={v => setForm(f => ({ ...f, accountHolderName: v }))}
            />

            <Text style={s.label}>Monthly Debit Amount (₹) *</Text>
            <TextInput
              style={s.input}
              placeholder="2500"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={String(form.monthlyAmount)}
              onChangeText={v => setForm(f => ({ ...f, monthlyAmount: parseInt(v) || 0 }))}
            />

            <TouchableOpacity style={s.agreeRow} onPress={() => setAgreed(a => !a)} activeOpacity={0.8}>
              <View style={[s.checkbox, agreed && s.checkboxActive]}>
                {agreed && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={s.agreeText}>
                I authorize Mana Community to debit{' '}
                <Text style={{ fontWeight: '700' }}>₹{form.monthlyAmount.toLocaleString('en-IN')}</Text>{' '}
                from my account on the 5th of each month for maintenance charges.
              </Text>
            </TouchableOpacity>

            <View style={s.secureNote}>
              <Ionicons name="lock-closed-outline" size={13} color={COLORS.textMuted} />
              <Text style={s.secureNoteText}>Your bank details are encrypted and never stored on our servers</Text>
            </View>

            <TouchableOpacity
              style={[s.setupBtn, (!agreed || setupMutation.isPending) && { opacity: 0.6 }]}
              onPress={handleSetup}
              disabled={!agreed || setupMutation.isPending}
            >
              {setupMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                    <Text style={s.setupBtnText}>Set Up Auto-Pay</Text>
                  </>
                )
              }
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.12)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: SPACING.lg, paddingBottom: 40 },

  activeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: '#A7F3D0' },
  activeBannerText: { fontSize: 14, fontWeight: '700', color: '#059669', fontFamily: 'Outfit-Bold' },

  mandateCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.md, marginBottom: SPACING.md, overflow: 'hidden' },
  mandateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SPACING.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  mandateLabel: { fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', width: 90 },
  mandateValue: { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Medium', fontWeight: '600', textAlign: 'right' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  upcomingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: '#A7F3D0' },
  upcomingLeft: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  upcomingTitle: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  upcomingDate: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 1 },
  upcomingAmount: { fontSize: 16, fontWeight: '900', color: '#059669', fontFamily: 'Outfit-Bold' },

  cancelNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: SPACING.md },
  cancelNoteText: { flex: 1, fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', lineHeight: 16 },
  cancelBtn: { paddingVertical: 13, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: '#DC2626', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#DC2626', fontFamily: 'Outfit-Bold' },

  infoCard: { backgroundColor: '#ECFDF5', borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: '#A7F3D0' },
  infoTitle: { fontSize: 15, fontWeight: '800', color: '#065F46', fontFamily: 'Outfit-Bold', marginBottom: SPACING.sm },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  bulletText: { fontSize: 13, color: '#047857', fontFamily: 'DMSans-Regular', flex: 1 },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginBottom: SPACING.md },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 5, fontFamily: 'DMSans-Medium' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 11, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular', marginBottom: SPACING.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, gap: 8 },
  eyeBtn: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md },

  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: SPACING.sm, marginTop: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxActive: { backgroundColor: '#059669', borderColor: '#059669' },
  agreeText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 18 },

  secureNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: SPACING.lg },
  secureNoteText: { flex: 1, fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  setupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', paddingVertical: 14, borderRadius: RADIUS.md, ...SHADOWS.md },
  setupBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
});
