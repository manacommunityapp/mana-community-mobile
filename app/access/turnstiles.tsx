import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { biometricAccessService, type TurnstileDto, type FaceVerificationResult } from '@/services/biometricAccessService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

export default function BiometricTurnstileScreen() {
  const router = useRouter();
  const [turnstiles, setTurnstiles] = useState<TurnstileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [lastResult, setLastResult] = useState<FaceVerificationResult | null>(null);

  useEffect(() => {
    loadTurnstiles();
  }, []);

  const loadTurnstiles = async () => {
    setLoading(true);
    try {
      const data = await biometricAccessService.getTurnstiles(1);
      setTurnstiles(data);
    } catch {
      // Handled in service fallback
    } finally {
      setLoading(false);
    }
  };

  const handleTestFaceScan = async (turnstile: TurnstileDto) => {
    setVerifying(true);
    try {
      const result = await biometricAccessService.verifyFace({
        societyId: turnstile.societyId,
        turnstileCode: turnstile.turnstileCode,
        confidenceScore: 0.942,
        timestamp: new Date().toISOString(),
      });
      setLastResult(result);
      if (result.decision === 'ACCESS_GRANTED') {
        Alert.alert('Gate Unlocked', `Face verified (${(result.confidenceScore * 100).toFixed(1)}%). Relay pulsing for 3 seconds.`);
      } else {
        Alert.alert('Access Denied', result.reason);
      }
    } catch {
      Alert.alert('Error', 'Face verification service unavailable.');
    } finally {
      setVerifying(false);
    }
  };

  const handleManualUnlock = async (turnstileId: number) => {
    try {
      const res = await biometricAccessService.triggerManualRelay(turnstileId);
      Alert.alert('Relay Triggered', res.message);
    } catch {
      Alert.alert('Error', 'Failed to trigger barrier relay');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Pedestrian Turnstiles"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Status Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconWrapper}>
            <Ionicons name="scan-circle" size={32} color="#0284C7" />
          </View>
          <View style={styles.bannerTextWrapper}>
            <Text style={styles.bannerTitle}>Edge AI Biometric Gates</Text>
            <Text style={styles.bannerSubtitle}>
              Facial recognition verification with 80% threshold & domestic staff hour enforcement.
            </Text>
          </View>
        </View>

        {/* Verification Result Banner */}
        {lastResult && (
          <View
            style={[
              styles.resultCard,
              { backgroundColor: lastResult.decision === 'ACCESS_GRANTED' ? '#ECFDF5' : '#FEF2F2',
                borderColor: lastResult.decision === 'ACCESS_GRANTED' ? '#10B981' : '#EF4444' },
            ]}
          >
            <Ionicons
              name={lastResult.decision === 'ACCESS_GRANTED' ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={lastResult.decision === 'ACCESS_GRANTED' ? '#059669' : '#DC2626'}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.resultTitle, { color: lastResult.decision === 'ACCESS_GRANTED' ? '#065F46' : '#991B1B' }]}>
                {lastResult.decision}
              </Text>
              <Text style={styles.resultSubtitle}>
                {lastResult.reason} ({ (lastResult.confidenceScore * 100).toFixed(1) }% match)
              </Text>
            </View>
          </View>
        )}

        {/* Turnstiles List */}
        <Text style={styles.sectionHeader}>Active Society Gates & Turnstiles</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 24 }} />
        ) : (
          turnstiles.map((ts) => (
            <View key={ts.id} style={styles.turnstileCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.turnstileName}>{ts.turnstileName}</Text>
                  <Text style={styles.turnstileLocation}>{ts.gateLocation} • {ts.turnstileCode}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: ts.status === 'ONLINE' ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={[styles.statusText, { color: ts.status === 'ONLINE' ? '#065F46' : '#991B1B' }]}>
                    {ts.status}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Threshold</Text>
                  <Text style={styles.statValue}>{(ts.confidenceThreshold * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Unlock Pulse</Text>
                  <Text style={styles.statValue}>{ts.unlockDurationSeconds}s</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Direction</Text>
                  <Text style={styles.statValue}>{ts.turnstileType === 'BIDIRECTIONAL' ? '2-Way' : 'Inbound'}</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.scanBtn]}
                  onPress={() => handleTestFaceScan(ts)}
                  disabled={verifying}
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.scanBtnText}>Test Face Scan</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.unlockBtn]}
                  onPress={() => handleManualUnlock(ts.id)}
                >
                  <Ionicons name="lock-open-outline" size={18} color="#0284C7" />
                  <Text style={styles.unlockBtnText}>Manual Pulse (3s)</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 16 },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  bannerIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerTextWrapper: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  bannerSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 },
  resultCard: {
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: { fontSize: 14, fontWeight: '700' },
  resultSubtitle: { fontSize: 12, color: '#475569', marginTop: 2 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  turnstileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  turnstileName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  turnstileLocation: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 12 },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 10, color: '#64748B', textTransform: 'uppercase' },
  statValue: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  scanBtn: { backgroundColor: '#0284C7' },
  scanBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  unlockBtn: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' },
  unlockBtnText: { color: '#0284C7', fontSize: 13, fontWeight: '600' },
});
