import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { InsuranceScreen, StateView, DisclosureBanner, Card } from '@/components/insurance/InsuranceUI';
import { insuranceService } from '@/services/insuranceService';
import { CATEGORIES, renewalBucket, maskPolicyNumber } from '@/constants/insurance';
import { THEME } from '@/constants/theme';
import { FONTS, RADIUS } from '@/constants/config';
import type { PolicyView } from '@/types/insurance';

const GROUP_COLORS: Record<string, { bg: string; color: string }> = {
  HEALTH: { bg: '#F0FDFA', color: '#0D9488' },
  LIFE:   { bg: '#EEF2FF', color: '#4F46E5' },
  MOTOR:  { bg: '#FEF3C7', color: '#D97706' },
  HOME:   { bg: '#ECFDF5', color: '#059669' },
  TRAVEL: { bg: '#E0F2FE', color: '#0284C7' },
  OTHER:  { bg: '#F3E8FF', color: '#7C3AED' },
};

type BucketKey = 'OVERDUE' | 'DUE_30' | 'DUE_60' | 'LATER' | 'UNKNOWN';
const BUCKET_STYLE: Record<BucketKey, { bg: string; text: string; label: string }> = {
  OVERDUE: { bg: '#FEE2E2', text: '#DC2626', label: 'Overdue' },
  DUE_30:  { bg: '#FEF3C7', text: '#D97706', label: 'Due in 30d' },
  DUE_60:  { bg: '#FEF9C3', text: '#CA8A04', label: 'Due in 60d' },
  LATER:   { bg: '#DCFCE7', text: '#059669', label: 'Active' },
  UNKNOWN: { bg: '#F1F5F9', text: '#64748B', label: 'Unknown' },
};

function PolicyCard({ policy }: { policy: PolicyView }) {
  const router = useRouter();
  const bucket = renewalBucket(policy) as BucketKey;
  const bs = BUCKET_STYLE[bucket];
  return (
    <Card onPress={() => router.push(`/insurance/policies/${policy.id}` as any)} label={policy.productName}>
      <View style={s.policyRow}>
        <View style={s.policyInfo}>
          <Text style={s.policyName} numberOfLines={1}>{policy.productName}</Text>
          <Text style={s.policyInsurer} numberOfLines={1}>{policy.insurerName}</Text>
          <Text style={s.policyNum}>{maskPolicyNumber(policy.maskedPolicyNumber)}</Text>
        </View>
        <View style={[s.bucketChip, { backgroundColor: bs.bg }]}>
          <Text style={[s.bucketText, { color: bs.text }]}>{bs.label}</Text>
        </View>
      </View>
    </Card>
  );
}

export default function InsuranceIndexScreen() {
  const router = useRouter();
  const policiesQ = useQuery({
    queryKey: ['insurance-policies'],
    queryFn: insuranceService.policies,
    staleTime: 60_000,
  });

  return (
    <InsuranceScreen title="🛡️ Insurance Hub" subtitle="Discover, manage and renew">
      <DisclosureBanner />

      {/* My Policies */}
      <Text style={s.sectionTitle}>My Policies</Text>
      {policiesQ.isLoading ? (
        <StateView kind="loading" message="Loading your policies…" />
      ) : policiesQ.isError ? (
        <StateView kind="error" message="Could not load policies." onRetry={() => policiesQ.refetch()} />
      ) : !policiesQ.data?.length ? (
        <Card>
          <Text style={s.emptyText}>No policies tracked yet.</Text>
          <Text style={s.emptyHint}>Add a policy to track renewal dates and get assistance.</Text>
        </Card>
      ) : (
        <>
          {policiesQ.data.slice(0, 3).map((p) => <PolicyCard key={p.id} policy={p} />)}
          {policiesQ.data.length > 3 && (
            <TouchableOpacity onPress={() => router.push('/insurance/policies' as any)} style={s.seeAll}>
              <Text style={s.seeAllText}>See all {policiesQ.data.length} policies →</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Browse */}
      <Text style={[s.sectionTitle, { marginTop: 8 }]}>Browse Insurance</Text>
      <View style={s.categoryGrid}>
        {CATEGORIES.map((cat) => {
          const gc = GROUP_COLORS[cat.group] ?? GROUP_COLORS.OTHER;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[s.catCard, { backgroundColor: gc.bg }]}
              onPress={() => router.push(`/insurance/catalogue/${cat.key}` as any)}
              accessibilityRole="button"
              accessibilityLabel={cat.label}
            >
              <Ionicons name={cat.icon as any} size={24} color={gc.color} />
              <Text style={[s.catLabel, { color: gc.color }]} numberOfLines={2}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick links */}
      <Text style={[s.sectionTitle, { marginTop: 8 }]}>Support & Tools</Text>
      <View style={s.quickRow}>
        {[
          { icon: 'document-text-outline', label: 'Claims\nAssistance', route: '/insurance/claims' },
          { icon: 'people-outline',         label: 'Group\nEnquiry',     route: '/insurance/group-enquiry' },
          { icon: 'lock-closed-outline',    label: 'My\nConsents',       route: '/insurance/consents' },
        ].map(({ icon, label, route }) => (
          <TouchableOpacity
            key={route}
            style={s.quickCard}
            onPress={() => router.push(route as any)}
            accessibilityRole="button"
            accessibilityLabel={label.replace('\n', ' ')}
          >
            <View style={s.quickIcon}>
              <Ionicons name={icon as any} size={22} color={THEME.brand} />
            </View>
            <Text style={s.quickLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </InsuranceScreen>
  );
}

const s = StyleSheet.create({
  sectionTitle: { fontFamily: FONTS.displaySemi, fontSize: 15, color: THEME.textPrimary, marginBottom: 10, marginTop: 4 },
  emptyText: { fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.textPrimary, marginBottom: 4 },
  emptyHint: { fontFamily: FONTS.regular, fontSize: 13, color: THEME.textSecondary },
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  policyInfo: { flex: 1 },
  policyName: { fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.textPrimary },
  policyInsurer: { fontFamily: FONTS.regular, fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  policyNum: { fontFamily: FONTS.regular, fontSize: 11, color: THEME.textMuted, marginTop: 2 },
  bucketChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  bucketText: { fontFamily: FONTS.semiBold, fontSize: 11 },
  seeAll: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 4 },
  seeAllText: { fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.brand },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  catCard: { width: '30%', borderRadius: RADIUS.lg, padding: 12, alignItems: 'center', gap: 6, minHeight: 80, justifyContent: 'center' },
  catLabel: { fontFamily: FONTS.semiBold, fontSize: 11, textAlign: 'center' },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  quickCard: { flex: 1, backgroundColor: THEME.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: THEME.border, padding: 12, alignItems: 'center', gap: 6 },
  quickIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.indigoLight, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: FONTS.semiBold, fontSize: 11, color: THEME.textPrimary, textAlign: 'center' },
});