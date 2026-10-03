import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import {
  parkingService,
  ParkingSpotDto,
  VisitorPassDto,
  ParkingOccupancySummaryDto,
} from '@/services/parkingService';

type ParkingFilter = 'MY_SPOTS' | 'AVAILABLE' | 'ALL' | 'VISITOR_PASS';

const TYPE_ICON: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  CAR:  { icon: 'car',            color: '#2563EB', bg: '#DBEAFE' },
  BIKE: { icon: 'bicycle',        color: '#7C3AED', bg: '#EDE9FE' },
  EV:   { icon: 'flash',          color: '#059669', bg: '#D1FAE5' },
};

export default function ParkingHomeScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<ParkingFilter>('MY_SPOTS');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'Basement 1' | 'Basement 2'>('ALL');

  // Reserve modal state
  const [reserveModalVisible, setReserveModalVisible] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotDto | null>(null);
  const [reserveVehicle, setReserveVehicle] = useState('KA-01-AB-1234');
  const [reserveType, setReserveType] = useState<'CAR' | 'BIKE' | 'EV'>('CAR');
  const [reserveNotes, setReserveNotes] = useState('');
  const [submittingReserve, setSubmittingReserve] = useState(false);

  // Visitor pass modal state
  const [visitorModalVisible, setVisitorModalVisible] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorVehicle, setVisitorVehicle] = useState('');
  const [visitorType, setVisitorType] = useState<'CAR' | 'BIKE' | 'EV'>('CAR');
  const [visitorPurpose, setVisitorPurpose] = useState('Guest Visit');
  const [submittingPass, setSubmittingPass] = useState(false);

  // Generated pass code modal
  const [generatedPass, setGeneratedPass] = useState<VisitorPassDto | null>(null);
  const [passSuccessModalVisible, setPassSuccessModalVisible] = useState(false);

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome])
  );

  // Queries
  const { data: occupancy, isLoading: occLoading, refetch: refetchOcc } = useQuery<ParkingOccupancySummaryDto>({
    queryKey: ['parkingOccupancy'],
    queryFn: parkingService.getOccupancySummary,
  });

  const { data: spots = [], isLoading: spotsLoading, refetch: refetchSpots } = useQuery<ParkingSpotDto[]>({
    queryKey: ['parkingSpots', levelFilter],
    queryFn: () => parkingService.getSpots(levelFilter === 'ALL' ? undefined : { level: levelFilter }),
  });

  const { data: visitorPasses = [], isLoading: passesLoading, refetch: refetchPasses } = useQuery<VisitorPassDto[]>({
    queryKey: ['parkingVisitorPasses'],
    queryFn: parkingService.getVisitorPasses,
  });

  const { data: activeEVSession } = useQuery({
    queryKey: ['activeEVSession'],
    queryFn: parkingService.getActiveEVSession,
  });

  const { data: anprLogs = [] } = useQuery({
    queryKey: ['anprLogsQuick'],
    queryFn: () => parkingService.getANPRLogs(),
  });

  const isLoading = occLoading || spotsLoading || passesLoading;

  const onRefresh = () => {
    refetchOcc();
    refetchSpots();
    refetchPasses();
  };

  const filteredSpots = spots.filter((s) => {
    if (filter === 'MY_SPOTS') return s.ownerName === 'You' || s.ownerFlat === 'A1-302';
    if (filter === 'AVAILABLE') return s.status === 'AVAILABLE';
    return true;
  });

  const handleReserveSpot = async () => {
    if (!selectedSpot || !reserveVehicle.trim()) {
      Alert.alert('Required Info', 'Please enter your vehicle plate number.');
      return;
    }
    setSubmittingReserve(true);
    try {
      await parkingService.reserveSpot({
        spotId: selectedSpot.id,
        vehicleNumber: reserveVehicle.trim().toUpperCase(),
        vehicleType: reserveType,
        notes: reserveNotes.trim(),
      });
      refetchSpots();
      refetchOcc();
      setReserveModalVisible(false);
      setReserveNotes('');
      Alert.alert('Spot Reserved', `Bay ${selectedSpot.spotNumber} has been linked to your vehicle ${reserveVehicle}.`);
    } catch {
      Alert.alert('Error', 'Unable to complete reservation.');
    } finally {
      setSubmittingReserve(false);
    }
  };

  const handleGeneratePass = async () => {
    if (!visitorName.trim() || !visitorVehicle.trim()) {
      Alert.alert('Required Info', 'Please enter guest name and vehicle number.');
      return;
    }
    setSubmittingPass(true);
    try {
      const pass = await parkingService.createVisitorPass({
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim(),
        vehicleNumber: visitorVehicle.trim().toUpperCase(),
        vehicleType: visitorType,
        purpose: visitorPurpose.trim(),
      });
      refetchPasses();
      refetchOcc();
      setVisitorModalVisible(false);
      setVisitorName('');
      setVisitorPhone('');
      setVisitorVehicle('');
      setGeneratedPass(pass);
      setPassSuccessModalVisible(true);
    } catch {
      Alert.alert('Error', 'Unable to generate visitor pass.');
    } finally {
      setSubmittingPass(false);
    }
  };

  const handleSharePass = (pass: VisitorPassDto) => {
    Share.share({
      title: `Mana Community Visitor Parking Pass: ${pass.passCode}`,
      message: `🚗 *Mana Community Visitor Parking Pass*\nPass Code: ${pass.passCode}\nGuest: ${pass.visitorName}\nVehicle: ${pass.vehicleNumber}\nAllocated Bay: ${pass.spotNumber || 'B2 Visitor Area'}\nShow this code at Security Gate for automated ANPR clearance.`,
    });
  };

  const latestANPR = anprLogs[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Top App Bar ───────────────────────────────────────────── */}
      <View style={styles.topAppBar}>
        <TouchableOpacity onPress={goHome} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.appBarTitle}>Smart Parking & EV Hub</Text>
          <Text style={styles.appBarSubtitle}>IoT Automated Basements & ANPR Gates</Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => router.push('/parking/anpr' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="videocam-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Occupancy & Sensor KPI Grid ───────────────────────────── */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="car" size={18} color="#059669" />
            </View>
            <Text style={styles.kpiValue}>
              {occupancy?.availableSpots ?? 56}
              <Text style={styles.kpiTotalText}> / {occupancy?.totalSpots ?? 180}</Text>
            </Text>
            <Text style={styles.kpiLabel}>Free Parking Slots</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="flash" size={18} color="#2563EB" />
            </View>
            <Text style={styles.kpiValue}>
              {occupancy?.availableEVSpots ?? 9}
              <Text style={styles.kpiTotalText}> / {occupancy?.totalEVSpots ?? 16}</Text>
            </Text>
            <Text style={styles.kpiLabel}>Free EV Chargers</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="business" size={18} color="#D97706" />
            </View>
            <Text style={styles.kpiValue}>{occupancy?.b1Available ?? 28} Free</Text>
            <Text style={styles.kpiLabel}>Basement 1</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="people" size={18} color="#9333EA" />
            </View>
            <Text style={styles.kpiValue}>{occupancy?.activeVisitors ?? 2}</Text>
            <Text style={styles.kpiLabel}>Active Guests</Text>
          </View>
        </View>

        {/* ── Specialized Navigation Hub Cards ──────────────────────── */}
        <View style={styles.hubSection}>
          {/* Card 1: EV Charging */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/parking/ev-charging' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="flash" size={24} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.hubTitleRow}>
                <Text style={styles.hubTitle}>EV Charging & Power Metering</Text>
                <View style={styles.evLiveBadge}>
                  <Text style={styles.evLiveBadgeText}>
                    {activeEVSession ? '⚡ 68% CHARGING' : 'PLUG & CHARGE'}
                  </Text>
                </View>
              </View>
              <Text style={styles.hubDesc}>
                Reserve 22kW Fast / 50kW DC Superchargers, track real-time kW & battery SoC curve, and get certified power invoices.
              </Text>
              <Text style={styles.hubActionLink}>Open EV Charging Station (/parking/ev-charging) →</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: ANPR Plate Recognition */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/parking/anpr' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="videocam" size={24} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.hubTitleRow}>
                <Text style={styles.hubTitle}>ANPR Plate Recognition & Gates</Text>
                <View style={styles.anprBadge}>
                  <Text style={styles.anprBadgeText}>SUB-200MS BOOM</Text>
                </View>
              </View>
              <Text style={styles.hubDesc}>
                AI Optical Character Recognition gate camera feeds, vehicle entry/exit timeline, and FASTag RFID whitelist rules.
              </Text>
              <Text style={styles.hubActionLink}>View ANPR Recognition History (/parking/anpr) →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Active EV Charging Quick Widget (if active) ─────────────── */}
        {activeEVSession && (
          <TouchableOpacity
            style={styles.evQuickWidget}
            onPress={() => router.push('/parking/ev-charging' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.evWidgetHeader}>
              <View style={styles.evWidgetTag}>
                <Ionicons name="flash" size={12} color="#FFFFFF" />
                <Text style={styles.evWidgetTagText}>ACTIVE CHARGING SESSION</Text>
              </View>
              <Text style={styles.evWidgetStation}>{activeEVSession.stationCode}</Text>
            </View>

            <View style={styles.evWidgetBody}>
              <View style={{ flex: 1 }}>
                <Text style={styles.evWidgetVehicle}>{activeEVSession.vehicleNumber}</Text>
                <Text style={styles.evWidgetMeta}>
                  {activeEVSession.powerOutputKW} kW Power · ₹{activeEVSession.currentCostINR.toFixed(1)} Accrued
                </Text>
              </View>
              <View style={styles.evWidgetSoCCircle}>
                <Text style={styles.evWidgetSoCText}>{activeEVSession.currentSoCPercentage}%</Text>
                <Text style={styles.evWidgetSoCLabel}>SoC</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Live ANPR Mini-Ticker ─────────────────────────────────── */}
        {latestANPR && (
          <View style={styles.tickerCard}>
            <View style={styles.tickerIconWrap}>
              <Ionicons name="shield-checkmark" size={16} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tickerTitle}>
                Latest Gate OCR: <Text style={{ fontFamily: 'Courier', fontWeight: 'bold' }}>{latestANPR.plateNumber}</Text>
              </Text>
              <Text style={styles.tickerSubtitle}>
                {latestANPR.gateName} · {latestANPR.direction} · {latestANPR.timestamp}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/parking/anpr' as any)}>
              <Text style={styles.tickerLink}>Live Log →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Filter Bar for Parking Bays ───────────────────────────── */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(
              [
                { key: 'MY_SPOTS', label: 'My Allocated Slots' },
                { key: 'AVAILABLE', label: 'Free Slots' },
                { key: 'ALL', label: 'All Bays' },
                { key: 'VISITOR_PASS', label: 'Visitor Passes' },
              ] as const
            ).map((tab) => {
              const isActive = filter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilter(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Content: Parking Spots / Visitor Passes ───────────────── */}
        {filter === 'VISITOR_PASS' ? (
          /* Visitor Pass Section */
          <View>
            <View style={styles.visitorHeaderRow}>
              <Text style={styles.sectionTitle}>Active Visitor Parking Passes</Text>
              <TouchableOpacity
                style={styles.genPassBtn}
                onPress={() => setVisitorModalVisible(true)}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.genPassBtnText}>New Visitor Pass</Text>
              </TouchableOpacity>
            </View>

            {visitorPasses.map((pass) => (
              <View key={pass.id} style={styles.visitorCard}>
                <View style={styles.visitorCardHeader}>
                  <View style={styles.passCodeBadge}>
                    <Text style={styles.passCodeText}>{pass.passCode}</Text>
                  </View>
                  <View
                    style={[
                      styles.passStatusPill,
                      pass.status === 'ACTIVE' ? styles.passActive : styles.passExpired,
                    ]}
                  >
                    <Text
                      style={[
                        styles.passStatusText,
                        { color: pass.status === 'ACTIVE' ? '#059669' : '#64748B' },
                      ]}
                    >
                      {pass.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.visitorName}>{pass.visitorName}</Text>
                <Text style={styles.visitorVehicle}>
                  🚗 {pass.vehicleNumber} ({pass.vehicleType}) · Bay: {pass.spotNumber || 'B2-Guest'}
                </Text>

                <View style={styles.visitorCardFooter}>
                  <Text style={styles.purposeText}>Purpose: {pass.purpose || 'Guest Visit'}</Text>
                  <TouchableOpacity
                    style={styles.sharePassBtn}
                    onPress={() => handleSharePass(pass)}
                  >
                    <Ionicons name="share-social-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.sharePassBtnText}>Share Pass</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* Parking Spots List */
          <View>
            {filteredSpots.map((spot) => {
              const iconConfig = TYPE_ICON[spot.type] || TYPE_ICON.CAR;
              const isAvailable = spot.status === 'AVAILABLE';
              const isMySpot = spot.ownerName === 'You';

              return (
                <View key={spot.id} style={styles.spotCard}>
                  <View style={[styles.spotIconCircle, { backgroundColor: iconConfig.bg }]}>
                    <Ionicons name={iconConfig.icon} size={20} color={iconConfig.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.spotTitleRow}>
                      <Text style={styles.spotNumber}>{spot.spotNumber}</Text>
                      <View
                        style={[
                          styles.spotStatusPill,
                          isAvailable
                            ? styles.statusPillAvail
                            : isMySpot
                            ? styles.statusPillMine
                            : styles.statusPillOccupied,
                        ]}
                      >
                        <Text
                          style={[
                            styles.spotStatusPillText,
                            {
                              color: isAvailable
                                ? '#059669'
                                : isMySpot
                                ? '#2563EB'
                                : '#64748B',
                            },
                          ]}
                        >
                          {isMySpot ? 'MY SPOT' : spot.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.spotLevel}>
                      {spot.level} · {spot.type} {spot.hasEVCharger ? '· ⚡ EV Charger Ready' : ''}
                    </Text>

                    {spot.vehicleNumber && (
                      <Text style={styles.spotVehicle}>
                        Plate: {spot.vehicleNumber} ({spot.ownerName})
                      </Text>
                    )}
                  </View>

                  {isAvailable && (
                    <TouchableOpacity
                      style={styles.reserveSpotBtn}
                      onPress={() => {
                        setSelectedSpot(spot);
                        setReserveModalVisible(true);
                      }}
                    >
                      <Text style={styles.reserveSpotBtnText}>Reserve</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Spot Reservation Modal ────────────────────────────────── */}
      <Modal visible={reserveModalVisible} transparent animationType="slide" onRequestClose={() => setReserveModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reserve Parking Bay</Text>
                <Text style={styles.modalSubtitle}>{selectedSpot?.spotNumber} · {selectedSpot?.level}</Text>
              </View>
              <TouchableOpacity onPress={() => setReserveModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Vehicle Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. KA-01-AB-1234"
              placeholderTextColor="#9CA3AF"
              value={reserveVehicle}
              onChangeText={setReserveVehicle}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Vehicle Type</Text>
            <View style={styles.typeSelectorRow}>
              {(
                [
                  { key: 'CAR', label: 'Car' },
                  { key: 'BIKE', label: 'Bike' },
                  { key: 'EV', label: 'EV' },
                ] as const
              ).map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeOption, reserveType === t.key && styles.typeOptionActive]}
                  onPress={() => setReserveType(t.key)}
                >
                  <Text style={[styles.typeOptionText, reserveType === t.key && styles.typeOptionTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Assigned to resident family member"
              placeholderTextColor="#9CA3AF"
              value={reserveNotes}
              onChangeText={setReserveNotes}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setReserveModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleReserveSpot}
                disabled={submittingReserve}
              >
                {submittingReserve ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>Confirm Slot</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Generate Visitor Pass Modal ───────────────────────────── */}
      <Modal visible={visitorModalVisible} transparent animationType="slide" onRequestClose={() => setVisitorModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Issue Visitor Parking Pass</Text>
                <Text style={styles.modalSubtitle}>Pre-authorize guest vehicle for ANPR gate entry</Text>
              </View>
              <TouchableOpacity onPress={() => setVisitorModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Guest Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kulkarni"
              placeholderTextColor="#9CA3AF"
              value={visitorName}
              onChangeText={setVisitorName}
            />

            <Text style={styles.inputLabel}>Vehicle Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. KA-03-XY-9081"
              placeholderTextColor="#9CA3AF"
              value={visitorVehicle}
              onChangeText={setVisitorVehicle}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Guest Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor="#9CA3AF"
              value={visitorPhone}
              onChangeText={setVisitorPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Purpose of Visit</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dinner & Family Visit"
              placeholderTextColor="#9CA3AF"
              value={visitorPurpose}
              onChangeText={setVisitorPurpose}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setVisitorModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleGeneratePass}
                disabled={submittingPass}
              >
                {submittingPass ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>Create Pass</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Pass Created Success Modal ────────────────────────────── */}
      <Modal visible={passSuccessModalVisible} transparent animationType="fade" onRequestClose={() => setPassSuccessModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-done" size={32} color="#059669" />
            </View>
            <Text style={styles.successTitle}>Visitor Pass Generated</Text>
            <Text style={styles.successSubtitle}>Pre-authorized on Security ANPR Gate System</Text>

            <View style={styles.passCodeBigBox}>
              <Text style={styles.passCodeBigText}>{generatedPass?.passCode}</Text>
              <Text style={styles.passCodeMeta}>Valid for 8 Hours at All Main Gates</Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnShare]}
                onPress={() => {
                  if (generatedPass) handleSharePass(generatedPass);
                }}
              >
                <Ionicons name="share-social-outline" size={16} color={COLORS.primary} />
                <Text style={styles.modalBtnShareText}>Share with Guest</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={() => setPassSuccessModalVisible(false)}
              >
                <Text style={styles.modalBtnSubmitText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  appBarSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    backgroundColor: '#F8FAFC',
    padding: SPACING.md,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  kpiTotalText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: 'DMSans-Regular',
  },
  kpiLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  hubSection: {
    marginBottom: SPACING.md,
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    ...SHADOWS.sm,
  },
  hubIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hubTitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    flex: 1,
  },
  evLiveBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  evLiveBadgeText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: '#059669',
  },
  anprBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  anprBadgeText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: '#1E40AF',
  },
  hubDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  hubActionLink: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: COLORS.primary,
  },
  evQuickWidget: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  evWidgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  evWidgetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  evWidgetTagText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  evWidgetStation: {
    fontSize: 11,
    color: '#94A3B8',
  },
  evWidgetBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  evWidgetVehicle: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  evWidgetMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  evWidgetSoCCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evWidgetSoCText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  evWidgetSoCLabel: {
    fontSize: 8,
    color: '#FFFFFF',
  },
  tickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 10,
    marginBottom: SPACING.md,
  },
  tickerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickerTitle: {
    fontSize: 12,
    color: '#166534',
  },
  tickerSubtitle: {
    fontSize: 10,
    color: '#166534',
    marginTop: 1,
  },
  tickerLink: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#15803D',
  },
  filterSection: {
    marginBottom: SPACING.md,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  visitorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  genPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  genPassBtnText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  visitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  visitorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  passCodeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  passCodeText: {
    fontSize: 12,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  passStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  passActive: {
    backgroundColor: '#D1FAE5',
  },
  passExpired: {
    backgroundColor: '#E2E8F0',
  },
  passStatusText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
  },
  visitorName: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  visitorVehicle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  visitorCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  purposeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  sharePassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sharePassBtnText: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: COLORS.primary,
  },
  spotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.sm,
    gap: 12,
    ...SHADOWS.sm,
  },
  spotIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spotNumber: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  spotStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillAvail: {
    backgroundColor: '#D1FAE5',
  },
  statusPillMine: {
    backgroundColor: '#DBEAFE',
  },
  statusPillOccupied: {
    backgroundColor: '#E2E8F0',
  },
  spotStatusPillText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
  },
  spotLevel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  spotVehicle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reserveSpotBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  reserveSpotBtnText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: '#F1F5F9',
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: COLORS.text,
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F1F5F9',
  },
  modalBtnCancelText: {
    color: COLORS.textSecondary,
    fontFamily: 'DMSans-Medium',
  },
  modalBtnSubmit: {
    backgroundColor: COLORS.primary,
  },
  modalBtnSubmitText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },
  successModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    ...SHADOWS.md,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  successSubtitle: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  passCodeBigBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  passCodeBigText: {
    fontSize: 24,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    color: '#1E293B',
    letterSpacing: 2,
  },
  passCodeMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  modalBtnShare: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    gap: 4,
  },
  modalBtnShareText: {
    color: COLORS.primary,
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
  },
});
