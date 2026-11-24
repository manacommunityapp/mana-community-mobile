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
  waterMaintenanceService,
  WaterStorageTank,
  WaterTankerDelivery,
  WaterPump,
  WaterQualityTest,
  TankCleaningSchedule,
  WaterTreatmentLog,
} from '@/services/waterMaintenanceService';

type TabKey = 'STORAGE' | 'TANKERS' | 'PUMPS' | 'QUALITY';

export default function WaterMaintenanceScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('STORAGE');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [tanks, setTanks] = useState<WaterStorageTank[]>([]);
  const [tankers, setTankers] = useState<WaterTankerDelivery[]>([]);
  const [pumps, setPumps] = useState<WaterPump[]>([]);
  const [qualityTests, setQualityTests] = useState<WaterQualityTest[]>([]);
  const [cleaningSchedules, setCleaningSchedules] = useState<TankCleaningSchedule[]>([]);
  const [treatmentLogs, setTreatmentLogs] = useState<WaterTreatmentLog[]>([]);

  // Modals
  const [tankerModalVisible, setTankerModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [cleaningModalVisible, setCleaningModalVisible] = useState(false);
  const [selectedTankForLevel, setSelectedTankForLevel] = useState<WaterStorageTank | null>(null);
  const [newLevelInput, setNewLevelInput] = useState('');

  // Tank cleaning form state
  const [cleaningTankId, setCleaningTankId] = useState<number>(1);
  const [cleaningVendor, setCleaningVendor] = useState('CleanTank India Services');
  const [cleaningLastDate, setCleaningLastDate] = useState(new Date().toISOString().split('T')[0]);
  const [cleaningNextDate, setCleaningNextDate] = useState(
    new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]
  );

  // Tanker form state
  const [tankerVendor, setTankerVendor] = useState('Sri Balaji Water Suppliers');
  const [tankerRegNo, setTankerRegNo] = useState('KA-01-AJ-8492');
  const [tankerVolume, setTankerVolume] = useState('12000');
  const [tankerCost, setTankerCost] = useState('1100');
  const [tankerTds, setTankerTds] = useState('185');
  const [gateGuard, setGateGuard] = useState('Security Main Gate');

  // Quality test form state
  const [sampleLocation, setSampleLocation] = useState('Domestic Sump Tap');
  const [phVal, setPhVal] = useState('7.3');
  const [tdsVal, setTdsVal] = useState('148');
  const [hardnessVal, setHardnessVal] = useState('120');
  const [chlorineVal, setChlorineVal] = useState('0.35');
  const [testerName, setTesterName] = useState('Facility QA Tech');

  const loadData = async () => {
    try {
      const [tList, tnkList, pList, qList, cList, trtList] = await Promise.all([
        waterMaintenanceService.getTanks(),
        waterMaintenanceService.getTankers(),
        waterMaintenanceService.getPumps(),
        waterMaintenanceService.getQualityTests(),
        waterMaintenanceService.getCleaningSchedules(),
        waterMaintenanceService.getTreatmentLogs(),
      ]);
      setTanks(tList);
      setTankers(tnkList);
      setPumps(pList);
      setQualityTests(qList);
      setCleaningSchedules(cList);
      setTreatmentLogs(trtList);
    } catch {
      // offline fallback handled by service
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

  const handleInwardTanker = async () => {
    const vol = parseFloat(tankerVolume);
    const cost = parseFloat(tankerCost);
    if (!vol || vol <= 0) {
      Alert.alert('Invalid Volume', 'Please enter a valid tanker water volume in liters.');
      return;
    }
    try {
      await waterMaintenanceService.inwardTanker({
        vendorName: tankerVendor.trim(),
        tankerRegNumber: tankerRegNo.trim(),
        volumeLiters: vol,
        cost: cost || 1100,
        invoiceNumber: `TNK-${Date.now().toString().slice(-4)}`,
        gateGuardName: gateGuard.trim() || 'Duty Guard',
        tdsPpm: parseFloat(tankerTds) || 180,
      });
      Alert.alert('Tanker Inwarded', `Successfully added +${vol.toLocaleString()} L water to domestic sump.`);
      setTankerModalVisible(false);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to inward water tanker');
    }
  };

  const handleTogglePump = async (pump: WaterPump) => {
    try {
      await waterMaintenanceService.togglePumpDutyStandby(pump.id);
      Alert.alert(
        'Pump Toggled',
        `${pump.name} switched to ${!pump.isDuty ? 'DUTY (RUNNING)' : 'STANDBY'}.`
      );
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to toggle pump status');
    }
  };

  const handleSaveQualityTest = async () => {
    const ph = parseFloat(phVal);
    const tds = parseFloat(tdsVal);
    const hardness = parseFloat(hardnessVal);
    const chlorine = parseFloat(chlorineVal);
    if (isNaN(ph) || isNaN(tds)) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for pH and TDS.');
      return;
    }
    try {
      await waterMaintenanceService.recordQualityTest({
        sampleLocation,
        ph,
        tdsPpm: tds,
        totalHardnessPpm: hardness,
        freeChlorinePpm: chlorine,
        testedBy: testerName,
      });
      Alert.alert('Water Quality Logged', 'IS:10500 Potability test logged successfully.');
      setTestModalVisible(false);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to log water quality test');
    }
  };

  const handleUpdateLevel = async () => {
    if (!selectedTankForLevel) return;
    const level = parseFloat(newLevelInput);
    if (isNaN(level) || level < 0) {
      Alert.alert('Invalid Level', 'Please enter a valid volume in liters.');
      return;
    }
    try {
      await waterMaintenanceService.updateTankLevel(selectedTankForLevel.id, level);
      Alert.alert('Level Updated', `${selectedTankForLevel.name} level updated to ${level.toLocaleString()} L in database.`);
      setLevelModalVisible(false);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to update tank level');
    }
  };

  const handleSaveCleaning = async () => {
    try {
      await waterMaintenanceService.recordCleaning({
        tankId: cleaningTankId,
        lastCleanedDate: cleaningLastDate,
        nextDueDate: cleaningNextDate,
        vendorName: cleaningVendor.trim() || 'CleanTank Services',
      });
      Alert.alert('Cleaning Logged', 'Tank cleaning record and next due countdown updated in database.');
      setCleaningModalVisible(false);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to record cleaning');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Water Management</Text>
          <Text style={styles.headerSubtitle}>Sumps, Tankers, Pumps & Potability</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setTankerModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation Strip */}
      <View style={styles.tabStrip}>
        {(['STORAGE', 'TANKERS', 'PUMPS', 'QUALITY'] as TabKey[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'STORAGE'
                ? 'Sumps & OHT'
                : tab === 'TANKERS'
                ? 'Tankers'
                : tab === 'PUMPS'
                ? 'HYPN Pumps'
                : 'IS:10500'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Syncing water storage telemetry...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* TAB 1: STORAGE & SUMPS */}
          {activeTab === 'STORAGE' && (
            <View>
              {/* Quick Summary Pill Banner */}
              <View style={styles.summaryBanner}>
                <View style={styles.bannerCol}>
                  <Text style={styles.bannerVal}>520 kL</Text>
                  <Text style={styles.bannerLbl}>Total Storage</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerCol}>
                  <Text style={[styles.bannerVal, { color: '#0284C7' }]}>78%</Text>
                  <Text style={styles.bannerLbl}>Avg Level</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerCol}>
                  <Text style={[styles.bannerVal, { color: '#059669' }]}>~24 hrs</Text>
                  <Text style={styles.bannerLbl}>Reserve Left</Text>
                </View>
              </View>

              {/* Tank Gauges */}
              {tanks.map(tank => {
                const isFireReserve = tank.tankType === 'UG_FIRE_RESERVE';
                const isCritical = tank.percentageFull < 30;

                return (
                  <View key={tank.id} style={styles.tankCard}>
                    <View style={styles.tankHeader}>
                      <View style={styles.tankTitleBox}>
                        <Text style={styles.tankName}>{tank.name}</Text>
                        <Text style={styles.tankTypeLabel}>
                          {tank.tankType.replace('_', ' ')} • Sensor: {tank.sensorStatus}
                        </Text>
                      </View>
                      {isFireReserve ? (
                        <View style={[styles.badge, { backgroundColor: '#FEF2F2' }]}>
                          <Text style={[styles.badgeText, { color: '#DC2626' }]}>🔥 FIRE LOCKED</Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: isCritical ? '#FEF2F2' : '#E0F2FE' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: isCritical ? '#DC2626' : '#0284C7' },
                            ]}
                          >
                            {tank.percentageFull}% FULL
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Progress Gauge */}
                    <View style={styles.gaugeTrack}>
                      <View
                        style={[
                          styles.gaugeFill,
                          {
                            width: `${tank.percentageFull}%`,
                            backgroundColor: isFireReserve
                              ? '#DC2626'
                              : isCritical
                              ? '#EF4444'
                              : '#0284C7',
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.tankFooter}>
                      <Text style={styles.tankVolText}>
                        Current: {(tank.currentLevelLiters / 1000).toFixed(1)} kL / {(tank.capacityLiters / 1000).toFixed(0)} kL
                      </Text>
                      <TouchableOpacity
                        style={styles.calibrateBtn}
                        onPress={() => {
                          setSelectedTankForLevel(tank);
                          setNewLevelInput(String(tank.currentLevelLiters));
                          setLevelModalVisible(true);
                        }}
                      >
                        <Ionicons name="create-outline" size={12} color="#0284C7" />
                        <Text style={styles.calibrateBtnText}>Edit Level</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Tank Cleaning AMC Section */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Mandatory Tank Cleaning AMCs</Text>
                <TouchableOpacity
                  style={styles.smallAddBtn}
                  onPress={() => setCleaningModalVisible(true)}
                >
                  <Ionicons name="add" size={13} color="#0284C7" />
                  <Text style={styles.smallAddBtnText}>Log Cleaning</Text>
                </TouchableOpacity>
              </View>
              {cleaningSchedules.map(sch => (
                <View key={sch.id} style={styles.cleaningCard}>
                  <View style={styles.cleaningTop}>
                    <Text style={styles.cleaningName}>{sch.tankName}</Text>
                    <View style={styles.cleaningBadge}>
                      <Text style={styles.cleaningBadgeText}>{sch.daysRemaining}d left</Text>
                    </View>
                  </View>
                  <Text style={styles.cleaningVendor}>Vendor: {sch.vendorName}</Text>
                  <Text style={styles.cleaningDate}>
                    Last: {sch.lastCleanedDate} • Next Due: {sch.nextDueDate}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* TAB 2: TANKERS */}
          {activeTab === 'TANKERS' && (
            <View>
              <TouchableOpacity
                style={styles.inwardTriggerBtn}
                onPress={() => setTankerModalVisible(true)}
              >
                <Ionicons name="water-outline" size={18} color="#FFFFFF" />
                <Text style={styles.inwardTriggerText}>Inward New Water Tanker Delivery</Text>
              </TouchableOpacity>

              <Text style={styles.sectionHeading}>Inward Tanker Deliveries</Text>
              {tankers.map(tanker => (
                <View key={tanker.id} style={styles.tankerCard}>
                  <View style={styles.tankerHeader}>
                    <View>
                      <Text style={styles.tankerVendor}>{tanker.vendorName}</Text>
                      <Text style={styles.tankerReg}>🚛 {tanker.tankerRegNumber}</Text>
                    </View>
                    <Text style={styles.tankerCost}>₹{tanker.cost}</Text>
                  </View>

                  <View style={styles.tankerMetaStrip}>
                    <Text style={styles.tankerMetaItem}>
                      💧 +{(tanker.volumeLiters / 1000).toFixed(0)} kL ({tanker.volumeLiters} L)
                    </Text>
                    {tanker.tdsPpm && (
                      <Text style={styles.tankerMetaItem}>TDS: {tanker.tdsPpm} ppm</Text>
                    )}
                    <Text style={styles.tankerMetaItem}>Gate: {tanker.gateGuardName}</Text>
                  </View>
                  <Text style={styles.tankerDate}>
                    Inwarded {tanker.deliveryDate.replace('T', ' ')} • Inv #{tanker.invoiceNumber}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* TAB 3: HYPN PUMPS */}
          {activeTab === 'PUMPS' && (
            <View>
              <Text style={styles.sectionHeading}>HYPN & Transfer Pump Sets</Text>
              {pumps.map(pump => (
                <View key={pump.id} style={styles.pumpCard}>
                  <View style={styles.pumpHeader}>
                    <View style={styles.pumpTitleBox}>
                      <Text style={styles.pumpName}>{pump.name}</Text>
                      <Text style={styles.pumpLoc}>📍 {pump.location}</Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            pump.status === 'RUNNING'
                              ? '#ECFDF5'
                              : pump.status === 'STANDBY'
                              ? '#F1F5F9'
                              : '#FEF2F2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              pump.status === 'RUNNING'
                                ? '#059669'
                                : pump.status === 'STANDBY'
                                ? '#64748B'
                                : '#DC2626',
                          },
                        ]}
                      >
                        {pump.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pumpMetaRow}>
                    <Text style={styles.pumpMetaText}>Rating: {pump.ratingKw} kW</Text>
                    <Text style={styles.pumpMetaText}>Run Total: {pump.runHoursTotal} hrs</Text>
                    <Text
                      style={[
                        styles.pumpMetaText,
                        { color: pump.isDuty ? '#059669' : '#D97706', fontWeight: '700' },
                      ]}
                    >
                      Role: {pump.isDuty ? 'MAIN DUTY' : 'STANDBY'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.pumpToggleBtn,
                      { backgroundColor: pump.isDuty ? '#F1F5F9' : '#4F46E5' },
                    ]}
                    onPress={() => handleTogglePump(pump)}
                  >
                    <Ionicons
                      name="swap-horizontal"
                      size={16}
                      color={pump.isDuty ? '#475569' : '#FFFFFF'}
                    />
                    <Text
                      style={[
                        styles.pumpToggleText,
                        { color: pump.isDuty ? '#475569' : '#FFFFFF' },
                      ]}
                    >
                      {pump.isDuty ? 'Switch to Standby' : 'Set as Main Duty Pump'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Treatment Operations Logbook */}
              <Text style={styles.sectionHeading}>WTP / STP Plant Operations</Text>
              {treatmentLogs.map(log => (
                <View key={log.id} style={styles.treatmentCard}>
                  <View style={styles.treatmentTop}>
                    <Text style={styles.treatmentUnit}>{log.treatmentUnit.replace('_', ' ')}</Text>
                    <Text style={styles.treatmentType}>{log.operationType}</Text>
                  </View>
                  <Text style={styles.treatmentRemarks}>{log.remarks}</Text>
                  <Text style={styles.treatmentMeta}>
                    Logged by {log.performedBy} on {log.logDate.split('T')[0]}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* TAB 4: WATER QUALITY (IS:10500) */}
          {activeTab === 'QUALITY' && (
            <View>
              <TouchableOpacity
                style={[styles.inwardTriggerBtn, { backgroundColor: '#059669' }]}
                onPress={() => setTestModalVisible(true)}
              >
                <Ionicons name="flask-outline" size={18} color="#FFFFFF" />
                <Text style={styles.inwardTriggerText}>Log Daily Water Potability Test</Text>
              </TouchableOpacity>

              <Text style={styles.sectionHeading}>IS:10500 Drinking Standards Scorecards</Text>
              {qualityTests.map(test => (
                <View key={test.id} style={styles.qualityCard}>
                  <View style={styles.qualityTop}>
                    <View>
                      <Text style={styles.qualityLocation}>{test.sampleLocation}</Text>
                      <Text style={styles.qualityDate}>{test.testDate} • by {test.testedBy}</Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: test.isCompliantIS10500 ? '#ECFDF5' : '#FEF2F2' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: test.isCompliantIS10500 ? '#059669' : '#DC2626' },
                        ]}
                      >
                        {test.isCompliantIS10500 ? 'CERTIFIED SAFE' : 'ACTION REQUIRED'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paramsGrid}>
                    <View style={styles.paramBox}>
                      <Text style={styles.paramVal}>{test.ph}</Text>
                      <Text style={styles.paramLbl}>pH (6.5-8.5)</Text>
                    </View>
                    <View style={styles.paramBox}>
                      <Text style={styles.paramVal}>{test.tdsPpm} ppm</Text>
                      <Text style={styles.paramLbl}>TDS (&lt;500)</Text>
                    </View>
                    <View style={styles.paramBox}>
                      <Text style={styles.paramVal}>{test.totalHardnessPpm} ppm</Text>
                      <Text style={styles.paramLbl}>Hardness</Text>
                    </View>
                    <View style={styles.paramBox}>
                      <Text style={styles.paramVal}>{test.freeChlorinePpm} ppm</Text>
                      <Text style={styles.paramLbl}>Free Chlorine</Text>
                    </View>
                  </View>

                  {test.notes ? (
                    <Text style={styles.qualityNotes}>{test.notes}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* INWARD TANKER MODAL */}
      <Modal visible={tankerModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inward Water Tanker</Text>
              <TouchableOpacity onPress={() => setTankerModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Water Tanker Reg Number</Text>
            <TextInput
              style={styles.input}
              value={tankerRegNo}
              onChangeText={setTankerRegNo}
              placeholder="e.g. KA-01-AJ-8492"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Vendor Name</Text>
            <TextInput
              style={styles.input}
              value={tankerVendor}
              onChangeText={setTankerVendor}
              placeholder="Vendor Name"
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Volume (Liters)</Text>
                <TextInput
                  style={styles.input}
                  value={tankerVolume}
                  onChangeText={setTankerVolume}
                  keyboardType="numeric"
                  placeholder="12000"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Cost (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={tankerCost}
                  onChangeText={setTankerCost}
                  keyboardType="numeric"
                  placeholder="1100"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Gate TDS (ppm)</Text>
                <TextInput
                  style={styles.input}
                  value={tankerTds}
                  onChangeText={setTankerTds}
                  keyboardType="numeric"
                  placeholder="185"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Gate Guard Approval</Text>
                <TextInput
                  style={styles.input}
                  value={gateGuard}
                  onChangeText={setGateGuard}
                  placeholder="Guard Name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.submitModalBtn} onPress={handleInwardTanker}>
              <Text style={styles.submitModalText}>Inward Delivery & Update Sump</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RECORD QUALITY TEST MODAL */}
      <Modal visible={testModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Potability Test</Text>
              <TouchableOpacity onPress={() => setTestModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Sampling Point</Text>
            <TextInput
              style={styles.input}
              value={sampleLocation}
              onChangeText={setSampleLocation}
              placeholder="e.g. Domestic Sump Tap / Tower A OHT"
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>pH (6.5 - 8.5)</Text>
                <TextInput
                  style={styles.input}
                  value={phVal}
                  onChangeText={setPhVal}
                  keyboardType="numeric"
                  placeholder="7.3"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>TDS (ppm)</Text>
                <TextInput
                  style={styles.input}
                  value={tdsVal}
                  onChangeText={setTdsVal}
                  keyboardType="numeric"
                  placeholder="148"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Hardness (ppm)</Text>
                <TextInput
                  style={styles.input}
                  value={hardnessVal}
                  onChangeText={setHardnessVal}
                  keyboardType="numeric"
                  placeholder="120"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Free Chlorine (ppm)</Text>
                <TextInput
                  style={styles.input}
                  value={chlorineVal}
                  onChangeText={setChlorineVal}
                  keyboardType="numeric"
                  placeholder="0.35"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>QA Technician / Tested By</Text>
            <TextInput
              style={styles.input}
              value={testerName}
              onChangeText={setTesterName}
              placeholder="Tester Name"
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={[styles.submitModalBtn, { backgroundColor: '#059669' }]}
              onPress={handleSaveQualityTest}
            >
              <Text style={styles.submitModalText}>Save Water Quality Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* UPDATE TANK LEVEL MODAL */}
      <Modal visible={levelModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Sump / OHT Level</Text>
              <TouchableOpacity onPress={() => setLevelModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Selected Tank</Text>
            <Text style={styles.readOnlyText}>{selectedTankForLevel?.name}</Text>

            <Text style={styles.inputLabel}>
              Current Measured Level (Liters) • Max: {selectedTankForLevel?.capacityLiters.toLocaleString()} L
            </Text>
            <TextInput
              style={styles.input}
              value={newLevelInput}
              onChangeText={setNewLevelInput}
              keyboardType="numeric"
              placeholder="e.g. 118000"
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={[styles.submitModalBtn, { backgroundColor: '#0284C7' }]}
              onPress={handleUpdateLevel}
            >
              <Text style={styles.submitModalText}>Save Level to Database</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RECORD TANK CLEANING AMC MODAL */}
      <Modal visible={cleaningModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Mechanized Tank Cleaning</Text>
              <TouchableOpacity onPress={() => setCleaningModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Target Tank / Sump</Text>
            <View style={styles.tankPickerRow}>
              {tanks.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tankPickChip, cleaningTankId === t.id && styles.tankPickChipActive]}
                  onPress={() => setCleaningTankId(t.id)}
                >
                  <Text
                    style={[
                      styles.tankPickText,
                      cleaningTankId === t.id && styles.tankPickTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {t.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Cleaning Vendor</Text>
            <TextInput
              style={styles.input}
              value={cleaningVendor}
              onChangeText={setCleaningVendor}
              placeholder="e.g. CleanTank India Services"
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Cleaned Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={cleaningLastDate}
                  onChangeText={setCleaningLastDate}
                  placeholder="2026-11-19"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Next Due Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={cleaningNextDate}
                  onChangeText={setCleaningNextDate}
                  placeholder="2027-05-19"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitModalBtn, { backgroundColor: '#4F46E5' }]}
              onPress={handleSaveCleaning}
            >
              <Text style={styles.submitModalText}>Save Cleaning AMC Record</Text>
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabItemActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 13, color: '#64748B', fontWeight: '600' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  bannerCol: { flex: 1, alignItems: 'center' },
  bannerVal: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  bannerLbl: { fontSize: 10, color: '#64748B', marginTop: 2, fontWeight: '600' },
  bannerDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  tankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  tankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  tankTitleBox: { flex: 1 },
  tankName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  tankTypeLabel: { fontSize: 10, color: '#64748B', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  gaugeTrack: { height: 10, backgroundColor: '#E0F2FE', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  gaugeFill: { height: '100%', borderRadius: 5 },
  tankFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tankVolText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  tankWarnText: { fontSize: 10, color: '#64748B' },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10, marginTop: 10 },
  cleaningCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cleaningTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cleaningName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  cleaningBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cleaningBadgeText: { fontSize: 10, fontWeight: '700', color: '#4F46E5' },
  cleaningVendor: { fontSize: 11, color: '#64748B', marginTop: 4 },
  cleaningDate: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  inwardTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  inwardTriggerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  tankerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  tankerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  tankerVendor: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  tankerReg: { fontSize: 12, color: '#475569', fontWeight: '600', marginTop: 2 },
  tankerCost: { fontSize: 15, fontWeight: '800', color: '#059669' },
  tankerMetaStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 6 },
  tankerMetaItem: { fontSize: 11, color: '#334155', fontWeight: '600' },
  tankerDate: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  pumpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  pumpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  pumpTitleBox: { flex: 1, marginRight: 8 },
  pumpName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  pumpLoc: { fontSize: 10, color: '#64748B', marginTop: 2 },
  pumpMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  pumpMetaText: { fontSize: 11, color: '#475569' },
  pumpToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  pumpToggleText: { fontSize: 11, fontWeight: '700' },
  treatmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  treatmentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  treatmentUnit: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  treatmentType: { fontSize: 10, fontWeight: '700', color: '#0284C7' },
  treatmentRemarks: { fontSize: 11, color: '#475569', marginTop: 4 },
  treatmentMeta: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  qualityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  qualityTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  qualityLocation: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  qualityDate: { fontSize: 10, color: '#64748B', marginTop: 2 },
  paramsGrid: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  paramBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paramVal: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  paramLbl: { fontSize: 9, color: '#64748B', marginTop: 2 },
  qualityNotes: { fontSize: 11, color: '#475569', marginTop: 4, fontStyle: 'italic' },
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
  submitModalBtn: { backgroundColor: '#0284C7', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  submitModalText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  calibrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 4,
  },
  calibrateBtnText: { fontSize: 10, fontWeight: '700', color: '#0284C7' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 10 },
  smallAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 2,
  },
  smallAddBtnText: { fontSize: 10, fontWeight: '700', color: '#0284C7' },
  readOnlyText: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 10, paddingVertical: 4 },
  tankPickerRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  tankPickChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  tankPickChipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  tankPickText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  tankPickTextActive: { color: '#4F46E5' },
});
