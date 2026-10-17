import React from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Header } from '@/components/common/Header';
import { PermissionGuard } from '@/components/common/PermissionGuard';
import { THEME } from '@/constants/theme';
import { FONTS, RADIUS } from '@/constants/config';
import { VIEW_INSURANCE } from '@/constants/permissions';
import { INSURANCE_ENABLED } from '@/constants/insurance';
import { a11yButton } from '@/utils/a11y';

/** Shared shell: feature flag + permission gate, header with back, scroll content. */
export function InsuranceScreen({
  title, subtitle, children, scroll = true,
}: { title: string; subtitle?: string; children: React.ReactNode; scroll?: boolean }) {
  const router = useRouter();
  if (!INSURANCE_ENABLED) {
    return (
      <SafeAreaView style={s.safe}>
        <Header title="Insurance" showBack onBack={() => router.back()} />
        <StateView kind="empty" title="Insurance is not available yet" message="This feature has not been enabled for your community." />
      </SafeAreaView>
    );
  }
  const body = scroll
    ? <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    : <View style={s.content}>{children}</View>;
  return (
    <PermissionGuard permission={VIEW_INSURANCE}>
      <SafeAreaView style={s.safe}>
        <Header title={title} subtitle={subtitle} showBack onBack={() => router.back()} />
        {body}
      </SafeAreaView>
    </PermissionGuard>
  );
}

export function StateView({
  kind, title, message, onRetry,
}: { kind: 'loading' | 'empty' | 'error'; title?: string; message?: string; onRetry?: () => void }) {
  if (kind === 'loading') {
    return (
      <View style={s.state} accessibilityRole="progressbar" accessibilityLabel="Loading">
        <ActivityIndicator color={THEME.brand} />
        <Text style={s.stateMsg}>{message ?? 'Loading…'}</Text>
      </View>
    );
  }
  return (
    <View style={s.state} accessibilityRole={kind === 'error' ? 'alert' : undefined}>
      <Text style={s.stateTitle}>{title ?? (kind === 'error' ? 'Something went wrong' : 'Nothing here yet')}</Text>
      {!!message && <Text style={s.stateMsg}>{message}</Text>}
      {kind === 'error' && onRetry && (
        <TouchableOpacity style={s.btnSecondary} onPress={onRetry} {...a11yButton('Retry')}>
          <Text style={s.btnSecondaryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Persistent regulatory disclosure. Shown on all quote/catalogue/policy surfaces. */
export function DisclosureBanner({ extra }: { extra?: string }) {
  return (
    <View style={s.disclosure} accessibilityRole="summary">
      <Text style={s.disclosureText}>
        Mana Community helps you discover and manage insurance. Insurance is sold, underwritten and serviced by
        the insurer or its authorised intermediary named on each product. Premiums, cover and claim outcomes are
        decided by them, not by Mana.{extra ? ' ' + extra : ''}
      </Text>
    </View>
  );
}

export function SandboxBadge({ label }: { label?: string | null }) {
  if (!label) return null;
  return (
    <View style={s.sandbox} accessibilityLabel={label}>
      <Text style={s.sandboxText}>{label}</Text>
    </View>
  );
}

export function Button({
  label, onPress, disabled, variant = 'primary', loading,
}: { label: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; loading?: boolean }) {
  const style = variant === 'primary' ? s.btn : variant === 'danger' ? s.btnDanger : s.btnSecondary;
  const text = variant === 'secondary' ? s.btnSecondaryText : s.btnText;
  return (
    <TouchableOpacity
      style={[style, (disabled || loading) && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled || loading}
      {...a11yButton(label)}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={text}>{label}</Text>}
    </TouchableOpacity>
  );
}

export function Field({
  label, error, hint, ...input
}: { label: string; error?: string; hint?: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
      <TextInput
        style={[s.input, !!error && { borderColor: THEME.lossDark }]}
        accessibilityLabel={label}
        accessibilityHint={error ? undefined : hint}
        placeholderTextColor={THEME.textMuted}
        {...input}
      />
      {!!error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}
    </View>
  );
}

/** Accessible validation summary shown above the form after a failed submit. */
export function ValidationSummary({ errors }: { errors: Record<string, string> }) {
  const keys = Object.keys(errors);
  if (!keys.length) return null;
  return (
    <View style={s.summary} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={s.summaryTitle}>Please fix {keys.length} {keys.length === 1 ? 'field' : 'fields'}:</Text>
      {keys.map((k) => <Text key={k} style={s.summaryItem}>• {errors[k]}</Text>)}
    </View>
  );
}

export function Card({ children, onPress, label }: { children: React.ReactNode; onPress?: () => void; label?: string }) {
  if (onPress) {
    return (
      <TouchableOpacity style={s.card} onPress={onPress} {...a11yButton(label ?? 'Open')}>{children}</TouchableOpacity>
    );
  }
  return <View style={s.card}>{children}</View>;
}

export const insuranceStyles = StyleSheet.create({
  h2: { fontFamily: FONTS.displaySemi, fontSize: 16, color: THEME.textPrimary, marginBottom: 8 },
  body: { fontFamily: FONTS.regular, fontSize: 13, color: THEME.textSecondary, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, backgroundColor: THEME.surfaceMuted },
  chipText: { fontFamily: FONTS.medium, fontSize: 12, color: THEME.textPrimary },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 16, paddingBottom: 48 },
  state: { padding: 32, alignItems: 'center', gap: 8 },
  stateTitle: { fontFamily: FONTS.displaySemi, fontSize: 16, color: THEME.textPrimary, textAlign: 'center' },
  stateMsg: { fontFamily: FONTS.regular, fontSize: 13, color: THEME.textSecondary, textAlign: 'center' },
  disclosure: { backgroundColor: THEME.indigoLight, borderRadius: RADIUS.md, padding: 12, marginBottom: 14 },
  disclosureText: { fontFamily: FONTS.regular, fontSize: 12, color: THEME.textPrimary, lineHeight: 17 },
  sandbox: { alignSelf: 'flex-start', backgroundColor: THEME.amberLight, borderColor: THEME.amber, borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  sandboxText: { fontFamily: FONTS.bold, fontSize: 11, color: '#92400E' },
  btn: { backgroundColor: THEME.brandDark, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  btnDanger: { backgroundColor: THEME.lossDark, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  btnText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 15 },
  btnSecondary: { borderColor: THEME.borderMedium, borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  btnSecondaryText: { color: THEME.textPrimary, fontFamily: FONTS.semiBold, fontSize: 14 },
  label: { fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.textPrimary, marginBottom: 4 },
  hint: { fontFamily: FONTS.regular, fontSize: 12, color: THEME.textSecondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: THEME.borderMedium, borderRadius: RADIUS.md, backgroundColor: THEME.surface, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONTS.regular, fontSize: 15, color: THEME.textPrimary, minHeight: 44 },
  error: { color: THEME.lossDark, fontFamily: FONTS.regular, fontSize: 12, marginTop: 4 },
  summary: { backgroundColor: THEME.lossLight, borderColor: THEME.lossBorder, borderWidth: 1, borderRadius: RADIUS.md, padding: 12, marginBottom: 14 },
  summaryTitle: { fontFamily: FONTS.semiBold, color: THEME.lossDark, marginBottom: 4 },
  summaryItem: { fontFamily: FONTS.regular, color: THEME.lossDark, fontSize: 13 },
  card: { backgroundColor: THEME.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: THEME.border, padding: 14, marginBottom: 12 },
});
