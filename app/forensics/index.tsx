import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/config';
import { forensicsService, formatRupees } from '@/services/forensicsService';
import type {
  ForensicVerificationReport,
  TimeTravelReconstruction,
  WormAuditEvent,
} from '@/types/forensics';

const SOCIETY_ID = 1;

export default function ForensicsScreen() {
  const [recon, setRecon] = useState<TimeTravelReconstruction | null>(null);
  const [audits, setAudits] = useState<WormAuditEvent[]>([]);
  const [verification, setVerification] = useState<ForensicVerificationReport | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [auds, ver, tt] = await Promise.all([
        forensicsService.listAuditEvents(SOCIETY_ID),
        forensicsService.verifyIntegrity(SOCIETY_ID),
        forensicsService.reconstructMarch31(SOCIETY_ID),
      ]);
      setAudits(auds);
      setVerification(ver);
      setRecon(tt);
    } catch {
      // Offline preview safe
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSeedB902 = async () => {
    try {
      const res = await forensicsService.seedB902Scenario(SOCIETY_ID);
      setRecon(res);
      Alert.alert(
        'Flat B-902 Time-Travel Ready',
        `As-Known Mar 31: ${formatRupees(res.asKnownBalancePaise)} | Restated: ${formatRupees(res.restatedBalancePaise)}`,
      );
      await loadAll();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to seed scenario');
    }
  };

  const handleAnchorMerkle = async () => {
    try {
      await forensicsService.anchorMerkleBatch(SOCIETY_ID);
      Alert.alert('Anchored', 'Merkle root anchored to S3 Object Lock COMPLIANCE store');
      await loadAll();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Merkle anchor failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Audit Forensics &amp; Time-Travel</Text>
        <Text style={styles.subtitle}>
          Bitemporal Flat B-902 Reconstruction + WORM KMS-ECDSA Audit Log
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Flat B-902 (March 31 Snapshot vs April Restated)</Text>
          {recon ? (
            <>
              <Text style={styles.metric}>
                As-Known Mar 31: {formatRupees(recon.asKnownBalancePaise)}
              </Text>
              <Text style={styles.metric}>
                Restated Mar 31: {formatRupees(recon.restatedBalancePaise)} (Δ{' '}
                {formatRupees(recon.retroactiveVariancePaise)})
              </Text>
              <Text style={styles.hint}>
                Replayed {recon.eventsReplayedFromCheckpoint} events after checkpoint •{' '}
                {recon.retroactiveAdjustments.length} April adjustments isolated
              </Text>
            </>
          ) : (
            <Text style={styles.hint}>Tap below to seed &amp; reconstruct Flat B-902</Text>
          )}
          <TouchableOpacity style={styles.button} onPress={handleSeedB902}>
            <Text style={styles.buttonText}>Reconstruct Flat B-902 March 31</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>WORM Integrity &amp; Merkle Anchors</Text>
          {verification && (
            <Text
              style={[
                styles.status,
                {
                  color:
                    verification.chainValid && verification.externalAnchorMatch
                      ? '#15803d'
                      : '#b91c1c',
                },
              ]}
            >
              {verification.chainValid && verification.externalAnchorMatch
                ? 'VERIFIED: Chain, ECDSA & S3 WORM Anchor Intact'
                : verification.failureReason}
            </Text>
          )}
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleAnchorMerkle}>
            <Text style={styles.secondaryBtnText}>Seal Merkle Anchor Batch</Text>
          </TouchableOpacity>
          {audits.slice(0, 5).map((a) => (
            <Text key={a.auditId} style={styles.auditRow}>
              #{a.seqNo} {a.actionType} ({a.riskTier}) • {a.actorName}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#475569', marginBottom: 4 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  metric: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  hint: { fontSize: 12, color: '#64748b' },
  status: { fontSize: 13, fontWeight: '600' },
  auditRow: { fontSize: 12, color: '#334155', marginTop: 2 },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryBtnText: { color: COLORS.primary, fontWeight: '600' },
});
