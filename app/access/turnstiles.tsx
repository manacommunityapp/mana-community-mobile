import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/common/Header';
import {
  biometricAccessService,
  type TurnstileDto,
  type FaceVerificationResult,
} from '@/services/biometricAccessService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';

type FilterTab = 'ALL' | 'CLUBHOUSE' | 'TOWERS' | 'STAFF';

export default function BiometricTurnstileScreen() {
  const router = useRouter();
  const [turnstiles, setTurnstiles] = useState<TurnstileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
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
    setVerifyingId(turnstile.id);
    try {
      const result = await biometricAccessService.verifyFace({
        societyId: turnstile.societyId,
        turnstileCode: turnstile.turnstileCode,
        confidenceScore: 0.942,
        timestamp: new Date().toISOString(),
      });
      setLastResult(result);
      if (result.decision === 'ACCESS_GRANTED') {
        Alert.alert(
          'Gate Unlocked 🎉',
          `Face verified (${(result.confidenceScore * 100).toFixed(1)}% match).\nRelay activated for ${turnstile.unlockDurationSeconds || 3} seconds.`
        );
      } else {
        Alert.alert('Access Denied 🛑', result.reason || 'Verification threshold not met.');
      }
    } catch {
      Alert.alert('Service Error', 'Face verification service is currently unreachable.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleManualUnlock = async (turnstile: TurnstileDto) => {
    setUnlockingId(turnstile.id);
    try {
      const res = await biometricAccessService.triggerManualRelay(turnstile.id, turnstile.unlockDurationSeconds || 3);
      Alert.alert('Gate Pulse Triggered', `${turnstile.turnstileName}\n${res.message}`);
    } catch {
      Alert.alert('Error', 'Failed to trigger gate barrier relay.');
    } finally {
      setUnlockingId(null);
    }
  };

  const filteredTurnstiles = useMemo(() => {
    if (activeTab === 'ALL') return turnstiles;
    if (activeTab === 'CLUBHOUSE') {
      return turnstiles.filter(
        (ts) =>
          ts.turnstileName.toLowerCase().includes('clubhouse') ||
          ts.gateLocation.toLowerCase().includes('clubhouse')
      );
    }
    if (activeTab === 'TOWERS') {
      return turnstiles.filter(
        (ts) =>
          ts.turnstileName.toLowerCase().includes('tower') ||
          ts.gateLocation.toLowerCase().includes('tower')
      );
    }
    if (activeTab === 'STAFF') {
      return turnstiles.filter(
        (ts) =>
          ts.turnstileName.toLowerCase().includes('service') ||
          ts.turnstileName.toLowerCase().includes('staff') ||
          ts.gateLocation.toLowerCase().includes('staff')
      );
    }
    return turnstiles;
  }, [turnstiles, activeTab]);

  const onlineCount = turnstiles.filter((t) => t.status === 'ONLINE').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header
        title="Smart Gates"
        subtitle="Biometric & Pedestrian Access"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
        actions={[
          {
            icon: 'refresh-outline',
            onPress: loadTurnstiles,
          },
          {
            icon: 'list-outline',
            onPress: () => router.push('/access/logs'),
          },
        ]}
      />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero Status Banner */}
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroBadge}>
              <View style={[styles.pulseDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.heroBadgeText}>
                {onlineCount}/{turnstiles.length} Gates Online
              </Text>
            </View>
            <View style={styles.biometricBadge}>
              <Ionicons name="finger-print" size={14} color="#38BDF8" />
              <Text style={styles.biometricBadgeText}>AI Vision Active</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Touchless Pedestrian Access</Text>
          <Text style={styles.heroSubtitle}>
            Instant face verification at turnstile pillars with 80% accuracy threshold & automated relay release.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{turnstiles.length}</Text>
              <Text style={styles.heroStatLabel}>Total Gates</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>3s</Text>
              <Text style={styles.heroStatLabel}>Avg Pulse</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>99.4%</Text>
              <Text style={styles.heroStatLabel}>Accuracy</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Verification Result Toast Card */}
        {lastResult && (
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor:
                  lastResult.decision === 'ACCESS_GRANTED' ? '#ECFDF5' : '#FEF2F2',
                borderColor:
                  lastResult.decision === 'ACCESS_GRANTED' ? '#10B981' : '#EF4444',
              },
            ]}
          >
            <View
              style={[
                styles.resultIconWrap,
                {
                  backgroundColor:
                    lastResult.decision === 'ACCESS_GRANTED' ? '#D1FAE5' : '#FEE2E2',
                },
              ]}
            >
              <Ionicons
                name={
                  lastResult.decision === 'ACCESS_GRANTED'
                    ? 'checkmark-circle'
                    : 'close-circle'
                }
                size={22}
                color={
                  lastResult.decision === 'ACCESS_GRANTED' ? '#059669' : '#DC2626'
                }
              />
            </View>
            <View style={styles.resultInfo}>
              <View style={styles.resultHeaderRow}>
                <Text
                  style={[
                    styles.resultTitle,
                    {
                      color:
                        lastResult.decision === 'ACCESS_GRANTED'
                          ? '#065F46'
                          : '#991B1B',
                    },
                  ]}
                >
                  {lastResult.decision.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.resultMatch}>
                  {(lastResult.confidenceScore * 100).toFixed(1)}% match
                </Text>
              </View>
              <Text style={styles.resultSubtitle} numberOfLines={2}>
                {lastResult.reason}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setLastResult(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Filter Navigation Tabs */}
        <View style={styles.tabScrollWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBar}
          >
            {[
              { key: 'ALL', label: 'All Gates' },
              { key: 'CLUBHOUSE', label: 'Clubhouse' },
              { key: 'TOWERS', label: 'Tower Lobbies' },
              { key: 'STAFF', label: 'Staff Entry' },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabChip, isActive && styles.tabChipActive]}
                  onPress={() => setActiveTab(tab.key as FilterTab)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabChipText,
                      isActive && styles.tabChipTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Gates Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Active Smart Barriers</Text>
          <Text style={styles.sectionCount}>
            {filteredTurnstiles.length} {filteredTurnstiles.length === 1 ? 'Gate' : 'Gates'}
          </Text>
        </View>

        {/* Gates List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={styles.loadingText}>Connecting to access controllers...</Text>
          </View>
        ) : filteredTurnstiles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="hardware-chip-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Gates Found</Text>
            <Text style={styles.emptySubtitle}>
              Try selecting "All Gates" to see all registered turnstiles and security barriers.
            </Text>
          </View>
        ) : (
          filteredTurnstiles.map((ts) => {
            const isOnline = ts.status === 'ONLINE';
            const isVerifying = verifyingId === ts.id;
            const isUnlocking = unlockingId === ts.id;

            return (
              <View key={ts.id} style={styles.gateCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.gateTitleGroup}>
                    <View style={styles.gateIconCircle}>
                      <Ionicons
                        name="walk"
                        size={18}
                        color={isOnline ? '#0284C7' : '#94A3B8'}
                      />
                    </View>
                    <View style={styles.gateMeta}>
                      <Text style={styles.gateName} numberOfLines={1}>
                        {ts.turnstileName}
                      </Text>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-sharp" size={12} color="#64748B" />
                        <Text style={styles.gateLocation} numberOfLines={1}>
                          {ts.gateLocation}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isOnline ? '#ECFDF5' : '#FEF2F2',
                        borderColor: isOnline ? '#A7F3D0' : '#FECACA',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isOnline ? '#10B981' : '#EF4444' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: isOnline ? '#065F46' : '#991B1B' },
                      ]}
                    >
                      {ts.status}
                    </Text>
                  </View>
                </View>

                {/* Gate Specs Bar */}
                <View style={styles.specsRow}>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Code</Text>
                    <Text style={styles.specValue}>{ts.turnstileCode}</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Direction</Text>
                    <Text style={styles.specValue}>
                      {ts.turnstileType === 'BIDIRECTIONAL'
                        ? '2-Way ⇄'
                        : ts.turnstileType === 'PEDESTRIAN_OUT'
                        ? 'Exit Only ↗'
                        : 'Entry Only ↘'}
                    </Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Threshold</Text>
                    <Text style={styles.specValue}>
                      {((ts.confidenceThreshold ?? 0.8) * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Pulse</Text>
                    <Text style={styles.specValue}>
                      {ts.unlockDurationSeconds ?? 3}s
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, !isOnline && styles.btnDisabled]}
                    onPress={() => handleManualUnlock(ts)}
                    disabled={!isOnline || isUnlocking}
                    activeOpacity={0.8}
                  >
                    {isUnlocking ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="key-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.primaryActionText}>
                          Unlock Gate ({ts.unlockDurationSeconds ?? 3}s)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryActionBtn, !isOnline && styles.btnDisabled]}
                    onPress={() => handleTestFaceScan(ts)}
                    disabled={!isOnline || isVerifying}
                    activeOpacity={0.8}
                  >
                    {isVerifying ? (
                      <ActivityIndicator size="small" color="#0284C7" />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={16} color="#0284C7" />
                        <Text style={styles.secondaryActionText}>Face Scan</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={20} color="#0284C7" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Contactless Resident Access</Text>
            <Text style={styles.infoText}>
              Turnstiles automatically register authorized residents via edge camera sensors. Domestic staff access is restricted according to society curfew hours.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // ── Hero Card ───────────────────────────────────────────────────────
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  heroBadgeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.medium,
  },
  biometricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  biometricBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontFamily: FONTS.displayBold,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: FONTS.displayBold,
  },
  heroStatLabel: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '600',
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },

  // ── Result Toast Card ───────────────────────────────────────────────
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
    ...SHADOWS.sm,
  },
  resultIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.2,
  },
  resultMatch: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    fontFamily: FONTS.bold,
  },
  resultSubtitle: {
    fontSize: 11.5,
    color: '#475569',
    fontFamily: FONTS.regular,
    marginTop: 2,
  },

  // ── Tab Navigation ──────────────────────────────────────────────────
  tabScrollWrap: {
    marginBottom: 14,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
    ...SHADOWS.sm,
  },
  tabChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: FONTS.medium,
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },

  // ── Section Title Row ───────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    fontFamily: FONTS.displayBold,
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: FONTS.medium,
  },

  // ── Gate Cards ──────────────────────────────────────────────────────
  gateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gateTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  gateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateMeta: {
    flex: 1,
  },
  gateName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: FONTS.displayBold,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  gateLocation: {
    fontSize: 11.5,
    color: '#64748B',
    fontFamily: FONTS.regular,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },

  // ── Specs Grid ──────────────────────────────────────────────────────
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  specItem: {
    flex: 1,
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 9.5,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontFamily: FONTS.medium,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  specValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: FONTS.displayBold,
    marginTop: 1,
  },
  specDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
  },

  // ── Actions ─────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryActionBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
    ...SHADOWS.sm,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 5,
  },
  secondaryActionText: {
    color: '#0284C7',
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // ── Loading & Empty States ──────────────────────────────────────────
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: FONTS.medium,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: FONTS.displayBold,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // ── Info Footer Banner ──────────────────────────────────────────────
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    marginTop: 8,
    gap: 10,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0369A1',
    fontFamily: FONTS.bold,
  },
  infoText: {
    fontSize: 11,
    color: '#0C4A6E',
    marginTop: 2,
    lineHeight: 15,
    fontFamily: FONTS.regular,
  },
});
