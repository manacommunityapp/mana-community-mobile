import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import {
  generatorMaintenanceService,
  GeneratorAsset,
  GeneratorRunLog,
  FuelRefillLog,
} from '@/services/generatorMaintenanceService';

export default function GeneratorMaintenanceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generators, setGenerators] = useState<GeneratorAsset[]>([]);
  const [selectedGenId, setSelectedGenId] = useState<number>(1);
  const [runLogs, setRunLogs] = useState<GeneratorRunLog[]>([]);
  const [refillLogs, setRefillLogs] = useState<FuelRefillLog[]>([]);

  // Modals
  const [runModalVisible, setRunModalVisible] = useState(false);
  const [refillModalVisible, setRefillModalVisible] = useState(false);
  const [calibModalVisible, setCalibModalVisible] = useState(false);

  // Calibration form
  const [editFuelLiters, setEditFuelLiters] = useState('340');
  const [editStatus, setEditStatus] = useState<'STANDBY' | 'RUNNING' | 'MAINTENANCE' | 'FAULT'>('STANDBY');
  const [editBattery, setEditBattery] = useState('26.4');
  const [editTemp, setEditTemp] = useState('68');

  // Run form
  const [gridReason, setGridReason] = useState('BESCOM 11kV Grid Failure');
  const [operatorName, setOperatorName] = useState('Shift Electrician');

  // Refill form
  const [refillLiters, setRefillLiters] = useState('200');
  const [pricePerLiter, setPricePerLiter] = useState('89.50');
  const [vendorName, setVendorName] = useState('Indian Oil Retailer');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receivedBy, setReceivedBy] = useState('Duty Guard / Facility Staff');

  const loadData = async () => {
    try {
      const [genList, rLogs, fLogs] = await Promise.all([
        generatorMaintenanceService.getGenerators(),
        generatorMaintenanceService.getRunLogs(),
        generatorMaintenanceService.getFuelRefillLogs(),
      ]);
      setGenerators(genList);
      setRunLogs(rLogs);
      setRefillLogs(fLogs);
      if (genList.length > 0 && !selectedGenId) {
        setSelectedGenId(genList[0].id);
      }
    } catch {
      // fallback handled by service
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

  const selectedGen = generators.find(g => g.id === selectedGenId) || generators[0];

  const handleStartRun = async () => {
    if (!selectedGen) return;
    try {
      await generatorMaintenanceService.startRunLog(selectedGen.id, {
        gridOutageReason: gridReason,
        operatorName,
      });
      Alert.alert('DG Started', `Run sheet started for ${selectedGen.name}. DG set is now ON LOAD.`);
      setRunModalVisible(false);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to start DG run');
    }
  };

  const handleStopRun = async (logId: number) => {
    try {
      await generatorMaintenanceService.stopRunLog(logId, {
        endFuelLiters: selectedGen ? selectedGen.currentFuelLiters - 25 : undefined,
        kwhGenerated: 160,
      });
      Alert.alert('DG Stopped', 'Run sheet completed. Fuel consumption and run hours logged.');
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to stop DG run');
    }
  };

  const handleRefill = async () => {
    if (!selectedGen) return;
    const liters = parseFloat(refillLiters);
    const price = parseFloat(pricePerLiter);
    if (!liters || liters <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid fuel volume in liters.');
      return;
    }
    try {
      await generatorMaintenanceService.logFuelRefill(selectedGen.id, {
        quantityLiters: liters,
        pricePerLiter: price || 90,
        vendorName: vendorName.trim() || 'IOCL Distributor',
        invoiceNumber: invoiceNumber.trim() || `DSL-${Date.now().toString().slice(-4)}`,
        receivedBy: receivedBy.trim() || 'Facility Staff',
      });
      Alert.alert('Fuel Inwarded', `Successfully topped up ${liters} L diesel into ${selectedGen.name}.`);
      setRefillModalVisible(false);
      setRefillLiters('');
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to log fuel refill');
    }
  };

  const handleSaveCalibration = async () => {
    if (!selectedGen) return;
    const fuel = parseFloat(editFuelLiters);
    const batt = parseFloat(editBattery);
    const temp = parseFloat(editTemp);
    if (isNaN(fuel) || fuel < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid fuel volume in liters.');
      return;
    }
    try {
      await generatorMaintenanceService.updateGeneratorTelemetry(selectedGen.id, {
        currentFuelLiters: fuel,
        status: editStatus,
        batteryVoltage: isNaN(batt) ? undefined : batt,
        coolantTempC: isNaN(temp) ? undefined : temp,
      });
      Alert.alert('Telemetry Updated', `${selectedGen.name} telemetry calibrated and saved to database.`);
      setCalibModalVisible(false);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to update telemetry');
    }
  };

  // 250h B-check progress calculation
  const hoursSinceBCheck = selectedGen ? selectedGen.hoursSinceLastService : 0;
  const bCheckProgressPct = Math.min(100, Math.round((hoursSinceBCheck / 250) * 100));
  const bCheckHoursLeft = Math.max(0, 250 - hoursSinceBCheck);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Diesel Generator Operations</Text>
          <Text style={styles.headerSubtitle}>DG Sets, Run Sheets & Fuel Logging</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading generator data...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Generator Selector Strip */}
          <View style={styles.genSelector}>
            {generators.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.genTab,
                  selectedGenId === g.id && styles.genTabActive,
                ]}
                onPress={() => setSelectedGenId(g.id)}
              >
                <Ionicons
                  name="flash"
                  size={14}
                  color={selectedGenId === g.id ? '#FFFFFF' : '#4F46E5'}
                />
                <Text
                  style={[
                    styles.genTabText,
                    selectedGenId === g.id && styles.genTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {g.name.split(' ')[0]} ({g.kvaRating}kVA)
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TELEMETRY DASHBOARD CARD */}
          {selectedGen && (
            <View style={styles.telemetryCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.genTitle}>{selectedGen.name}</Text>
                  <Text style={styles.genModel}>{selectedGen.makeModel}</Text>
                  <Text style={styles.genLocation}>📍 {selectedGen.location}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        selectedGen.status === 'RUNNING'
                          ? '#FEF2F2'
                          : selectedGen.status === 'STANDBY'
                          ? '#ECFDF5'
                          : '#FFFBEB',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          selectedGen.status === 'RUNNING'
                            ? '#DC2626'
                            : selectedGen.status === 'STANDBY'
                            ? '#059669'
                            : '#D97706',
                      },
                    ]}
                  >
                    ● {selectedGen.status}
                  </Text>
                </View>
              </View>

              {/* Fuel Level Meter */}
              <View style={styles.fuelGaugeBox}>
                <View style={styles.fuelGaugeHeader}>
                  <View style={styles.fuelTitleRow}>
                    <Ionicons name="color-filter-outline" size={16} color="#D97706" />
                    <Text style={styles.fuelLabel}>Diesel Tank Level</Text>
                  </View>
                  <Text style={styles.fuelQty}>
                    {selectedGen.currentFuelLiters} / {selectedGen.fuelCapacityLiters} L (
                    {Math.round((selectedGen.currentFuelLiters / selectedGen.fuelCapacityLiters) * 100)}%)
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.round(
                          (selectedGen.currentFuelLiters / selectedGen.fuelCapacityLiters) * 100
                        )}%`,
                        backgroundColor:
                          selectedGen.currentFuelLiters / selectedGen.fuelCapacityLiters < 0.25
                            ? '#EF4444'
                            : '#D97706',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.fuelBurnNote}>
                  Est. ~{Math.round(selectedGen.currentFuelLiters / 25)} hours backup available at 75% load
                </Text>
              </View>

              {/* Sensor Diagnostics Grid */}
              <View style={styles.diagGrid}>
                <View style={styles.diagItem}>
                  <Ionicons name="battery-charging-outline" size={16} color="#059669" />
                  <Text style={styles.diagVal}>{selectedGen.batteryVoltage} V</Text>
                  <Text style={styles.diagLbl}>Battery (24V DC)</Text>
                </View>
                <View style={styles.diagDivider} />
                <View style={styles.diagItem}>
                  <Ionicons name="thermometer-outline" size={16} color="#DC2626" />
                  <Text style={styles.diagVal}>{selectedGen.coolantTempC} °C</Text>
                  <Text style={styles.diagLbl}>Coolant Temp</Text>
                </View>
                <View style={styles.diagDivider} />
                <View style={styles.diagItem}>
                  <Ionicons name="time-outline" size={16} color="#4F46E5" />
                  <Text style={styles.diagVal}>{selectedGen.totalRunHours} h</Text>
                  <Text style={styles.diagLbl}>Total Run Hours</Text>
                </View>
              </View>

              {/* B-Check Preventive Maintenance Countdown */}
              <View style={styles.bCheckCard}>
                <View style={styles.bCheckHeader}>
                  <Text style={styles.bCheckTitle}>250-Hour B-Check Service Cycle</Text>
                  <Text style={styles.bCheckDueBadge}>
                    {bCheckHoursLeft > 0 ? `${bCheckHoursLeft} hrs left` : 'SERVICE DUE NOW'}
                  </Text>
                </View>
                <View style={styles.bCheckProgressTrack}>
                  <View
                    style={[
                      styles.bCheckProgressFill,
                      {
                        width: `${bCheckProgressPct}%`,
                        backgroundColor: bCheckHoursLeft < 30 ? '#EF4444' : '#4F46E5',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.bCheckSub}>
                  {hoursSinceBCheck} / 250 hrs clocked since last oil & filter change
                </Text>
              </View>

              {/* Quick Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: '#D97706' }]}
                  onPress={() => setRunModalVisible(true)}
                >
                  <Ionicons name="play-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>Start DG Run</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
                  onPress={() => setRefillModalVisible(true)}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>Inward Fuel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: '#4F46E5' }]}
                  onPress={() => {
                    setEditFuelLiters(String(selectedGen.currentFuelLiters));
                    setEditStatus(selectedGen.status);
                    setEditBattery(String(selectedGen.batteryVoltage));
                    setEditTemp(String(selectedGen.coolantTempC));
                    setCalibModalVisible(true);
                  }}
                >
                  <Ionicons name="options-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>Calibrate</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ACTIVE / RECENT RUN LOGS */}
          <Text style={styles.sectionHeading}>Recent DG Run Logbook</Text>
          {runLogs.map(log => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={styles.logStatusRow}>
                  <Ionicons
                    name={log.status === 'IN_PROGRESS' ? 'hourglass' : 'checkmark-circle'}
                    size={16}
                    color={log.status === 'IN_PROGRESS' ? '#D97706' : '#059669'}
                  />
                  <Text
                    style={[
                      styles.logStatusText,
                      { color: log.status === 'IN_PROGRESS' ? '#D97706' : '#059669' },
                    ]}
                  >
                    {log.status === 'IN_PROGRESS' ? 'RUNNING ON LOAD' : 'COMPLETED RUN'}
                  </Text>
                </View>
                <Text style={styles.logDate}>{log.startTime.split('T')[0]}</Text>
              </View>

              <Text style={styles.logReason}>Reason: {log.gridOutageReason}</Text>
              <Text style={styles.logOperator}>Operator: {log.operatorName}</Text>

              <View style={styles.logMetaStrip}>
                <Text style={styles.logMetaItem}>
                  Duration: {log.durationMinutes ? `${log.durationMinutes} mins` : 'Active'}
                </Text>
                {log.fuelConsumedLiters !== undefined && (
                  <Text style={styles.logMetaItem}>Fuel: -{log.fuelConsumedLiters} L</Text>
                )}
                {log.kwhGenerated !== undefined && (
                  <Text style={styles.logMetaItem}>Units: {log.kwhGenerated} kWh</Text>
                )}
              </View>

              {log.status === 'IN_PROGRESS' && (
                <TouchableOpacity
                  style={styles.stopBtn}
                  onPress={() => handleStopRun(log.id)}
                >
                  <Ionicons name="stop-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.stopBtnText}>Stop DG & Finalize Log</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* DIESEL REFILL HISTORY */}
          <Text style={styles.sectionHeading}>Diesel Refill Inwarding History</Text>
          {refillLogs.map(refill => (
            <View key={refill.id} style={styles.refillCard}>
              <View style={styles.refillTop}>
                <Text style={styles.refillVendor}>{refill.vendorName}</Text>
                <Text style={styles.refillCost}>₹{refill.totalCost.toLocaleString('en-IN')}</Text>
              </View>
              <Text style={styles.refillSub}>
                +{refill.quantityLiters} Liters @ ₹{refill.pricePerLiter}/L • Inv #{refill.invoiceNumber}
              </Text>
              <Text style={styles.refillDate}>
                Received on {refill.refillDate} by {refill.receivedBy}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* START DG RUN MODAL */}
      <Modal visible={runModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Start DG Run Sheet</Text>
              <TouchableOpacity onPress={() => setRunModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Grid Outage Reason / Trigger</Text>
            <TextInput
              style={styles.input}
              value={gridReason}
              onChangeText={setGridReason}
              placeholder="e.g. BESCOM 11kV Grid Failure / Scheduled Maintenance"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Duty Electrician / Operator</Text>
            <TextInput
              style={styles.input}
              value={operatorName}
              onChangeText={setOperatorName}
              placeholder="Operator Name"
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity style={styles.submitModalBtn} onPress={handleStartRun}>
              <Text style={styles.submitModalText}>Engage DG & Start Logging</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* INWARD DIESEL REFILL MODAL */}
      <Modal visible={refillModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inward Diesel Fuel Top-Up</Text>
              <TouchableOpacity onPress={() => setRefillModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Quantity (Liters)</Text>
            <TextInput
              style={styles.input}
              value={refillLiters}
              onChangeText={setRefillLiters}
              keyboardType="numeric"
              placeholder="e.g. 250"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Rate per Liter (₹)</Text>
            <TextInput
              style={styles.input}
              value={pricePerLiter}
              onChangeText={setPricePerLiter}
              keyboardType="numeric"
              placeholder="89.50"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Fuel Vendor / Outlet</Text>
            <TextInput
              style={styles.input}
              value={vendorName}
              onChangeText={setVendorName}
              placeholder="e.g. Indian Oil Corporation Ltd"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Invoice / Cash Memo Number</Text>
            <TextInput
              style={styles.input}
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
              placeholder="e.g. INV-IOCL-99214"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Received & Verified By</Text>
            <TextInput
              style={styles.input}
              value={receivedBy}
              onChangeText={setReceivedBy}
              placeholder="Staff Name"
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={[styles.submitModalBtn, { backgroundColor: '#059669' }]}
              onPress={handleRefill}
            >
              <Text style={styles.submitModalText}>Save Diesel Inward Voucher</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CALIBRATE TELEMETRY / MANUAL FUEL OVERRIDE MODAL */}
      <Modal visible={calibModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calibrate DG Telemetry</Text>
              <TouchableOpacity onPress={() => setCalibModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Fuel Level (Liters) • Capacity: {selectedGen?.fuelCapacityLiters} L</Text>
            <TextInput
              style={styles.input}
              value={editFuelLiters}
              onChangeText={setEditFuelLiters}
              keyboardType="numeric"
              placeholder="340"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Power Source / Operational Status</Text>
            <View style={styles.statusSelectRow}>
              {(['STANDBY', 'RUNNING', 'MAINTENANCE', 'FAULT'] as const).map(st => (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusSelectChip, editStatus === st && styles.statusSelectChipActive]}
                  onPress={() => setEditStatus(st)}
                >
                  <Text style={[styles.statusSelectText, editStatus === st && styles.statusSelectTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Battery Voltage (V)</Text>
                <TextInput
                  style={styles.input}
                  value={editBattery}
                  onChangeText={setEditBattery}
                  keyboardType="numeric"
                  placeholder="26.4"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Coolant Temp (°C)</Text>
                <TextInput
                  style={styles.input}
                  value={editTemp}
                  onChangeText={setEditTemp}
                  keyboardType="numeric"
                  placeholder="68"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitModalBtn, { backgroundColor: '#4F46E5' }]}
              onPress={handleSaveCalibration}
            >
              <Text style={styles.submitModalText}>Save Calibration to Database</Text>
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
  genSelector: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  genTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  genTabActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  genTabText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  genTabTextActive: { color: '#FFFFFF' },
  telemetryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  genTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  genModel: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '600' },
  genLocation: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  fuelGaugeBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  fuelGaugeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fuelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fuelLabel: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  fuelQty: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  progressBarTrack: { height: 10, backgroundColor: '#FDE68A', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  fuelBurnNote: { fontSize: 10, color: '#B45309', marginTop: 6, fontStyle: 'italic' },
  diagGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  diagItem: { flex: 1, alignItems: 'center' },
  diagVal: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  diagLbl: { fontSize: 9, color: '#64748B', marginTop: 2, fontWeight: '600' },
  diagDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  bCheckCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  bCheckHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bCheckTitle: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  bCheckDueBadge: { fontSize: 10, fontWeight: '800', color: '#4F46E5' },
  bCheckProgressTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  bCheckProgressFill: { height: '100%', borderRadius: 3 },
  bCheckSub: { fontSize: 10, color: '#64748B' },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  primaryActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10, marginTop: 4 },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  logStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logStatusText: { fontSize: 11, fontWeight: '800' },
  logDate: { fontSize: 10, color: '#94A3B8' },
  logReason: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  logOperator: { fontSize: 11, color: '#64748B', marginTop: 2 },
  logMetaStrip: { flexDirection: 'row', gap: 12, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  logMetaItem: { fontSize: 10, color: '#475569', fontWeight: '600' },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    gap: 4,
  },
  stopBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  refillCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  refillTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refillVendor: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  refillCost: { fontSize: 13, fontWeight: '800', color: '#059669' },
  refillSub: { fontSize: 11, color: '#475569', marginTop: 2 },
  refillDate: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
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
    marginBottom: 12,
  },
  submitModalBtn: { backgroundColor: '#4F46E5', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  submitModalText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  statusSelectRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  statusSelectChip: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  statusSelectChipActive: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#4F46E5' },
  statusSelectText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  statusSelectTextActive: { color: '#4F46E5' },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputCol: { flex: 1 },
});
