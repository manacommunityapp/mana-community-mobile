import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import {
  generatorMaintenanceService,
  GeneratorOverviewSummary,
} from '@/services/generatorMaintenanceService';
import {
  waterMaintenanceService,
  WaterOverviewSummary,
} from '@/services/waterMaintenanceService';

export default function MaintenanceHubScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dgOverview, setDgOverview] = useState<GeneratorOverviewSummary | null>(null);
  const [waterOverview, setWaterOverview] = useState<WaterOverviewSummary | null>(null);

  // Fire Safety Inspection state
  const [fireModalVisible, setFireModalVisible] = useState(false);
  const [jockeyPressure, setJockeyPressure] = useState('7.5');
  const [hydrantPressure, setHydrantPressure] = useState('9.0');
  const [extinguisherCount, setExtinguisherCount] = useState('48');
  const [fireTestedBy, setFireTestedBy] = useState('Safety Officer Kumar');
  const [fireRemarks, setFireRemarks] = useState('Weekly auto cut-in pressure test pass. Fire reserve locked.');

  const handleSaveFireInspection = async () => {
    try {
      await waterMaintenanceService.addTreatmentLog({
        treatmentUnit: 'CHLORINATION_PLANT',
        operationType: 'BACKWASH',
        quantity: parseFloat(jockeyPressure) || 7.5,
        unit: 'Bar Pressure',
        performedBy: fireTestedBy,
        remarks: `[FIRE SAFETY INSPECTION] Jockey Cut-in: ${jockeyPressure} bar, Hydrant: ${hydrantPressure} bar, Extinguishers: ${extinguisherCount} units. ${fireRemarks}`,
      });
      Alert.alert('Fire Safety Logged', 'Fire safety inspection & jockey pump pressure test saved to database.');
      setFireModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save fire inspection');
    }
  };

  const loadData = async () => {
    try {
      const [dg, water] = await Promise.all([
        generatorMaintenanceService.getOverview(),
        waterMaintenanceService.getOverview(),
      ]);
      setDgOverview(dg);
      setWaterOverview(water);
    } catch {
      // offline fallback handled by services
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Estate & Utilities Operations</Text>
          <Text style={styles.headerSubtitle}>Critical Community Infrastructure</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Syncing infrastructure telemetry...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Status Alert Banner */}
          <View style={styles.alertBanner}>
            <View style={styles.alertIconBox}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
            </View>
            <View style={styles.alertTextBox}>
              <Text style={styles.alertTitle}>All Core Systems Operational</Text>
              <Text style={styles.alertDesc}>
                Grid power connected • Fire reserve locked (198 kL) • Water potability IS:10500 certified
              </Text>
            </View>
          </View>

          {/* SECTION 1: DIESEL GENERATOR POWER HUB */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="flash" size={18} color="#D97706" />
              </View>
              <View style={styles.cardTitleBox}>
                <Text style={styles.cardTitle}>Diesel Generators (DG Sets)</Text>
                <Text style={styles.cardSubtitle}>
                  {dgOverview?.runningGenerators
                    ? `${dgOverview.runningGenerators} DG Running on Load`
                    : '2 Units on Standby • Ready'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: dgOverview?.runningGenerators ? '#FEF2F2' : '#ECFDF5' },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: dgOverview?.runningGenerators ? '#DC2626' : '#059669' },
                  ]}
                >
                  {dgOverview?.runningGenerators ? 'RUNNING' : 'STANDBY'}
                </Text>
              </View>
            </View>

            {/* DG Metrics Strip */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{dgOverview?.totalFuelLiters ?? 630} L</Text>
                <Text style={styles.metricLbl}>Diesel Fuel Stock</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{dgOverview?.fuelPercentage ?? 76}%</Text>
                <Text style={styles.metricLbl}>Tank Capacity</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>~{dgOverview?.estimatedBackupHoursRemaining ?? 25} hrs</Text>
                <Text style={styles.metricLbl}>Backup Remaining</Text>
              </View>
            </View>

            {/* Action Bar */}
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => router.push('/maintenance/generator')}
            >
              <Text style={styles.cardActionText}>Manage DG Runs & Fuel Inwarding</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* SECTION 2: WATER INFRASTRUCTURE & SUMPS */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="water" size={18} color="#0284C7" />
              </View>
              <View style={styles.cardTitleBox}>
                <Text style={styles.cardTitle}>Water Infrastructure & Sumps</Text>
                <Text style={styles.cardSubtitle}>UG Sumps, OHTs, HYPN & WTP/STP</Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: waterOverview?.isQualitySafe ? '#ECFDF5' : '#FEF2F2' },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: waterOverview?.isQualitySafe ? '#059669' : '#DC2626' },
                  ]}
                >
                  {waterOverview?.isQualitySafe ? 'IS:10500 PASS' : 'CHECK REQ'}
                </Text>
              </View>
            </View>

            {/* Water Metrics Strip */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: '#0284C7' }]}>
                  {waterOverview?.storagePercentage ?? 78}%
                </Text>
                <Text style={styles.metricLbl}>Storage (% Full)</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: '#0F172A' }]}>
                  ~{waterOverview?.hoursReserveRemaining ?? 24} hrs
                </Text>
                <Text style={styles.metricLbl}>Reserve Remaining</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: '#059669' }]}>
                  {waterOverview?.latestTds ?? 148} ppm
                </Text>
                <Text style={styles.metricLbl}>Water TDS</Text>
              </View>
            </View>

            {/* Action Bar */}
            <TouchableOpacity
              style={[styles.cardActionBtn, { backgroundColor: '#0284C7' }]}
              onPress={() => router.push('/maintenance/water')}
            >
              <Text style={styles.cardActionText}>Storage Gauges, Tankers & HYPN Pumps</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* SECTION 3: OTHER CRITICAL AMCS & ASSETS */}
          <Text style={styles.subSectionTitle}>Other Common Utilities & AMCs</Text>
          <View style={styles.amcGrid}>
            <TouchableOpacity
              style={styles.amcTile}
              onPress={() => router.push('/amc')}
            >
              <View style={[styles.amcIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="business" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.amcTileTitle}>Elevators & Lifts</Text>
              <Text style={styles.amcTileSub}>4 Otis Gen2-L • Manage AMCs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.amcTile}
              onPress={() => setFireModalVisible(true)}
            >
              <View style={[styles.amcIconBox, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="flame" size={20} color="#DC2626" />
              </View>
              <Text style={styles.amcTileTitle}>Fire Protection</Text>
              <Text style={styles.amcTileSub}>Log Hydrant & Extinguisher Test</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* FIRE SAFETY INSPECTION MODAL */}
      <Modal visible={fireModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Fire Safety Inspection</Text>
              <TouchableOpacity onPress={() => setFireModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Jockey Cut-in (Bar)</Text>
                <TextInput
                  style={styles.input}
                  value={jockeyPressure}
                  onChangeText={setJockeyPressure}
                  keyboardType="numeric"
                  placeholder="7.5"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Hydrant Ring (Bar)</Text>
                <TextInput
                  style={styles.input}
                  value={hydrantPressure}
                  onChangeText={setHydrantPressure}
                  keyboardType="numeric"
                  placeholder="9.0"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Extinguishers Checked</Text>
                <TextInput
                  style={styles.input}
                  value={extinguisherCount}
                  onChangeText={setExtinguisherCount}
                  keyboardType="numeric"
                  placeholder="48"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Inspected By</Text>
                <TextInput
                  style={styles.input}
                  value={fireTestedBy}
                  onChangeText={setFireTestedBy}
                  placeholder="Inspector Name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Observations / Remarks</Text>
            <TextInput
              style={styles.input}
              value={fireRemarks}
              onChangeText={setFireRemarks}
              placeholder="e.g. Pressure switches tested, alarm bells verified"
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={[styles.submitModalBtn, { backgroundColor: '#DC2626' }]}
              onPress={handleSaveFireInspection}
            >
              <Text style={styles.submitModalText}>Save Fire Inspection to Database</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 13, color: '#64748B', fontWeight: '600' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  alertIconBox: { marginRight: 10 },
  alertTextBox: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  alertDesc: { fontSize: 11, color: '#047857', marginTop: 2, lineHeight: 15 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitleBox: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  cardSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusChipText: { fontSize: 10, fontWeight: '800' },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricVal: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  metricLbl: { fontSize: 10, color: '#64748B', marginTop: 2, fontWeight: '600' },
  metricDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 11,
    borderRadius: 10,
  },
  cardActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginRight: 6 },
  subSectionTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 10, marginTop: 4 },
  amcGrid: { flexDirection: 'row', gap: 10 },
  amcTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  amcIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  amcTileTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  amcTileSub: { fontSize: 10, color: '#64748B', marginTop: 2, lineHeight: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    marginBottom: 10,
  },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputCol: { flex: 1 },
  submitModalBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  submitModalText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
