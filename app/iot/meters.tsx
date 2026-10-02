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
import {
  smartMeterService,
  type SmartMeterDto,
  type UtilityConsumptionSummary,
} from '@/services/smartMeterService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

export default function SmartMetersScreen() {
  const router = useRouter();
  const [meters, setMeters] = useState<SmartMeterDto[]>([]);
  const [summary, setSummary] = useState<UtilityConsumptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatingId, setSimulatingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mList, sData] = await Promise.all([
        smartMeterService.getUnitMeters(504),
        smartMeterService.getConsumptionSummary(504),
      ]);
      setMeters(mList);
      setSummary(sData);
    } catch {
      // Service fallbacks handle mocks
    } finally {
      setLoading(false);
    }
  };

  const handlePulseSimulate = async (meter: SmartMeterDto) => {
    setSimulatingId(meter.id);
    try {
      const delta = meter.meterType === 'WATER' ? 500 : 15;
      await smartMeterService.simulatePulseIngestion(meter.id, delta);
      Alert.alert(
        'Telemetry Pulse Ingested',
        `Added +${delta} ${meter.unitOfMeasure} via direct MQTT / Modbus pulse listener.`
      );
      loadData();
    } catch {
      Alert.alert('Error', 'Pulse ingestion failed');
    } finally {
      setSimulatingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Smart Sub-Meters (IoT)"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Billing Overview Card */}
        {summary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryTitle}>Current Billing Cycle</Text>
                <Text style={styles.summarySub}>{summary.unitNumber} • {summary.cycleMonth}</Text>
              </View>
              <View style={styles.cfbosBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.cfbosText}>CFBOS GL Synced</Text>
              </View>
            </View>

            <View style={styles.amountBanner}>
              <Text style={styles.amountLabel}>Estimated Utility Charges</Text>
              <Text style={styles.amountValue}>₹{summary.totalUtilityAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.breakdownGrid}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownType}>Electricity</Text>
                <Text style={styles.breakdownUsage}>{summary.electricityKWh} kWh</Text>
                <Text style={styles.breakdownCost}>₹{summary.electricityAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownType}>Water</Text>
                <Text style={styles.breakdownUsage}>{summary.waterLiters} L</Text>
                <Text style={styles.breakdownCost}>₹{summary.waterAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownType}>DG Backup</Text>
                <Text style={styles.breakdownUsage}>{summary.dgBackupKWh} kWh</Text>
                <Text style={styles.breakdownCost}>₹{summary.dgBackupAmount.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Active Meters Grid */}
        <Text style={styles.sectionHeader}>Installed Digital Sub-Meters</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 24 }} />
        ) : (
          meters.map((meter) => {
            const isElectricity = meter.meterType === 'ELECTRICITY';
            const isWater = meter.meterType === 'WATER';
            const iconColor = isElectricity ? '#D97706' : isWater ? '#0284C7' : '#7C3AED';
            const iconBg = isElectricity ? '#FEF3C7' : isWater ? '#E0F2FE' : '#EDE9FE';
            const iconName = isElectricity ? 'flash' : isWater ? 'water' : 'hardware-chip';

            return (
              <View key={meter.id} style={styles.meterCard}>
                <View style={styles.meterTopRow}>
                  <View style={[styles.meterIconBox, { backgroundColor: iconBg }]}>
                    <Ionicons name={iconName as any} size={24} color={iconColor} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.meterTitle}>{meter.meterType.replace('_', ' ')} METER</Text>
                    <Text style={styles.meterSerial}>{meter.meterNumber}</Text>
                  </View>
                  <View style={[styles.meterStatusBadge, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={styles.meterStatusText}>{meter.status}</Text>
                  </View>
                </View>

                <View style={styles.readingContainer}>
                  <Text style={styles.readingLabel}>Live Cumulative Pulse Reading</Text>
                  <Text style={styles.readingValue}>
                    {meter.currentReading.toLocaleString()} <Text style={styles.readingUnit}>{meter.unitOfMeasure}</Text>
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.simulateBtn}
                  onPress={() => handlePulseSimulate(meter)}
                  disabled={simulatingId === meter.id}
                >
                  {simulatingId === meter.id ? (
                    <ActivityIndicator size="small" color="#0284C7" />
                  ) : (
                    <>
                      <Ionicons name="pulse-outline" size={16} color="#0284C7" />
                      <Text style={styles.simulateBtnText}>Simulate Telemetry Pulse</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 16 },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  summarySub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cfbosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  cfbosText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  amountBanner: { backgroundColor: '#F0F9FF', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 14 },
  amountLabel: { fontSize: 11, color: '#0369A1', textTransform: 'uppercase', fontWeight: '600' },
  amountValue: { fontSize: 26, fontWeight: '800', color: '#0C4A6E', marginTop: 2 },
  breakdownGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  breakdownItem: { flex: 1, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, alignItems: 'center' },
  breakdownType: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  breakdownUsage: { fontSize: 12, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  breakdownCost: { fontSize: 12, fontWeight: '700', color: '#0284C7', marginTop: 2 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: 12 },
  meterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  meterTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  meterIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  meterTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  meterSerial: { fontSize: 11, color: '#64748B', marginTop: 2 },
  meterStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  meterStatusText: { fontSize: 10, fontWeight: '700', color: '#065F46' },
  readingContainer: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 12 },
  readingLabel: { fontSize: 11, color: '#64748B' },
  readingValue: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  readingUnit: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  simulateBtnText: { color: '#0284C7', fontSize: 13, fontWeight: '600' },
});
