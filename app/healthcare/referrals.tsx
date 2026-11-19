import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { healthcareService, Referral } from '../../services/healthcareService';

const URGENCY_COLORS: Record<string, { bg: string; text: string }> = {
  URGENT: { bg: '#fef2f2', text: '#dc2626' },
  HIGH: { bg: '#fff7ed', text: '#ea580c' },
  NORMAL: { bg: '#f0fdf4', text: '#16a34a' },
  LOW: { bg: '#f8fafc', text: '#64748b' },
};

type ReferralStatus = 'ISSUED' | 'ACCEPTED' | 'COMPLETED' | 'EXPIRED';

const TIMELINE_STEPS: { status: ReferralStatus; label: string; icon: string }[] = [
  { status: 'ISSUED', label: 'Issued', icon: 'document-outline' },
  { status: 'ACCEPTED', label: 'Accepted', icon: 'checkmark-circle-outline' },
  { status: 'COMPLETED', label: 'Completed', icon: 'ribbon-outline' },
];

function ReferralTimeline({ status, issuedAt, acceptedAt, completedAt }: {
  status: string;
  issuedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
}) {
  if (status === 'EXPIRED') {
    return (
      <View style={styles.expiredRow}>
        <Ionicons name="time-outline" size={14} color="#94a3b8" />
        <Text style={styles.expiredTxt}>Referral expired</Text>
      </View>
    );
  }

  const dates: Record<string, string | undefined> = {
    ISSUED: issuedAt, ACCEPTED: acceptedAt, COMPLETED: completedAt,
  };

  const currentIdx = TIMELINE_STEPS.findIndex(s => s.status === status);

  return (
    <View style={styles.timeline}>
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < currentIdx || (i === currentIdx && status === 'COMPLETED');
        const active = i === currentIdx && status !== 'COMPLETED';
        const dateStr = dates[step.status];
        return (
          <View key={step.status} style={styles.timelineStep}>
            {/* connector line above (not for first item) */}
            {i > 0 && (
              <View style={[styles.timelineConnector, done && styles.timelineConnectorDone]} />
            )}
            <View style={[
              styles.timelineDot,
              done && styles.timelineDotDone,
              active && styles.timelineDotActive,
            ]}>
              <Ionicons
                name={step.icon as any}
                size={12}
                color={done ? '#fff' : active ? '#2563eb' : '#94a3b8'}
              />
            </View>
            <View style={styles.timelineContent}>
              <Text style={[
                styles.timelineLabel,
                done && { color: '#1e293b', fontWeight: '700' },
                active && { color: '#2563eb', fontWeight: '700' },
              ]}>
                {step.label}
              </Text>
              {dateStr && (
                <Text style={styles.timelineDate}>{new Date(dateStr).toLocaleDateString()}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function ReferralsScreen() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setReferrals(await healthcareService.listReferrals()); }
    catch { Alert.alert('Error', 'Failed to load referrals'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={referrals}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No referrals</Text>}
        renderItem={({ item }) => {
          const urgency = URGENCY_COLORS[item.urgency] || URGENCY_COLORS.NORMAL;
          return (
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.referredToName}</Text>
                  <Text style={styles.sub}>
                    {item.referredToType}{item.specialization ? ` · ${item.specialization}` : ''}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: urgency.bg }]}>
                  <Text style={[styles.badgeTxt, { color: urgency.text }]}>{item.urgency}</Text>
                </View>
              </View>

              {/* Reason */}
              <Text style={styles.reason}>{item.reason}</Text>

              {/* Status timeline */}
              <ReferralTimeline
                status={item.status}
                issuedAt={item.referralDate || item.createdAt}
                acceptedAt={item.appointmentDate}
                completedAt={item.status === 'COMPLETED' ? item.appointmentDate : undefined}
              />

              <Text style={styles.meta}>Patient #{item.patientUserId}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  reason: { fontSize: 13, color: '#475569', marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
  expiredRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: '#f8fafc', borderRadius: 8 },
  expiredTxt: { fontSize: 13, color: '#94a3b8' },
  // Timeline
  timeline: { paddingLeft: 4, marginBottom: 4 },
  timelineStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  timelineConnector: { position: 'absolute', left: 11, top: -10, width: 2, height: 10, backgroundColor: '#e2e8f0' },
  timelineConnectorDone: { backgroundColor: '#2563eb' },
  timelineDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
    marginRight: 10, marginTop: 2,
  },
  timelineDotDone: { backgroundColor: '#2563eb' },
  timelineDotActive: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#2563eb' },
  timelineContent: { flex: 1, paddingBottom: 10 },
  timelineLabel: { fontSize: 13, color: '#94a3b8' },
  timelineDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
