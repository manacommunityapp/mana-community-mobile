import React, { useState } from 'react';
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
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  parkingService,
  EVChargerStationDto,
  EVChargingSessionDto,
  EVChargingHistoryDto,
} from '@/services/parkingService';

type EVTab = 'STATIONS' | 'ACTIVE_SESSION' | 'HISTORY';

export default function EVChargingScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<EVTab>('ACTIVE_SESSION');
  const [selectedStationForBooking, setSelectedStationForBooking] = useState<EVChargerStationDto | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  // Booking Form State
  const [bookVehicle, setBookVehicle] = useState('KA-01-EV-9821 (Nexon EV)');
  const [bookTime, setBookTime] = useState('06:00 PM');
  const [bookDurationHours, setBookDurationHours] = useState(2);
  const [bookTargetSoC, setBookTargetSoC] = useState('85');

  // Queries
  const { data: stations = [], isLoading: stationsLoading, refetch: refetchStations, isRefetching: isRefetchingStations } = useQuery({
    queryKey: ['evStations'],
    queryFn: parkingService.getEVStations,
  });

  const { data: activeSession, isLoading: sessionLoading, refetch: refetchSession } = useQuery({
    queryKey: ['activeEVSession'],
    queryFn: parkingService.getActiveEVSession,
  });

  const { data: history = [], isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['evHistory'],
    queryFn: parkingService.getEVChargingHistory,
  });

  const isLoading = stationsLoading || sessionLoading || historyLoading;

  const onRefresh = () => {
    refetchStations();
    refetchSession();
    refetchHistory();
  };

  // Mutations
  const stopChargingMutation = useMutation({
    mutationFn: (sessionId: string) => parkingService.stopEVCharging(sessionId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['activeEVSession'] });
      qc.invalidateQueries({ queryKey: ['evStations'] });
      qc.invalidateQueries({ queryKey: ['evHistory'] });
      Alert.alert(
        'Charging Concluded',
        `Delivered: ${data.summary.energyDeliveredKWh} kWh\nTotal Cost: ₹${data.summary.totalCostINR}\nCO₂ Saved: ${data.summary.co2SavedKg} kg\n\nYour session receipt is available in charging history.`
      );
      setActiveTab('HISTORY');
    },
  });

  const startChargingMutation = useMutation({
    mutationFn: ({ stationId, vehicle }: { stationId: string; vehicle: string }) =>
      parkingService.startEVCharging(stationId, vehicle),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activeEVSession'] });
      qc.invalidateQueries({ queryKey: ['evStations'] });
      Alert.alert('Power Flow Active', 'High-voltage relay connected. Real-time telemetry is now active on your dashboard.');
      setActiveTab('ACTIVE_SESSION');
    },
  });

  const bookStationMutation = useMutation({
    mutationFn: (req: any) => parkingService.bookEVStation(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evStations'] });
      setBookingModalVisible(false);
      Alert.alert('Bay Reserved', 'Your EV charging bay slot has been pre-authorized. Auto-barrier clearance will be enabled.');
    },
  });

  const handleOpenBooking = (station: EVChargerStationDto) => {
    setSelectedStationForBooking(station);
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = () => {
    if (!selectedStationForBooking) return;
    bookStationMutation.mutate({
      stationId: selectedStationForBooking.id,
      vehicleNumber: bookVehicle,
      date: 'Today',
      startTime: bookTime,
      durationMinutes: bookDurationHours * 60,
      targetSoCPercentage: Number(bookTargetSoC) || 85,
    });
  };

  const handleShareInvoice = (item: EVChargingHistoryDto) => {
    Share.share({
      title: 'EV Power Metering Invoice',
      message: `⚡ *Mana Community EV Power Invoice*\nStation: ${item.stationCode}\nVehicle: ${item.vehicleNumber}\nEnergy: ${item.energyDeliveredKWh} kWh\nCost: ₹${item.totalCostINR}\nCO₂ Offset: ${item.co2SavedKg} kg\nDate: ${item.date}`,
    });
  };

  return (
    <View style={styles.container}>
      {/* ── Top Navigation Tabs ───────────────────────────────────── */}
      <View style={styles.topTabBar}>
        {(
          [
            { key: 'ACTIVE_SESSION', label: 'Live Power Telemetry', icon: 'flash' },
            { key: 'STATIONS', label: 'Charging Bays', icon: 'car-sport' },
            { key: 'HISTORY', label: 'Invoices & History', icon: 'receipt' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.topTabBtn, isActive && styles.topTabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={15}
                color={isActive ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.topTabBtnText, isActive && styles.topTabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetchingStations} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : activeTab === 'ACTIVE_SESSION' ? (
          /* ── TAB 1: LIVE POWER TELEMETRY DASHBOARD ─────────────── */
          activeSession ? (
            <View style={styles.sessionContainer}>
              {/* Active Header Card */}
              <View style={styles.liveHeaderCard}>
                <View style={styles.livePulseRow}>
                  <View style={styles.livePulseBadge}>
                    <View style={styles.pulsingDot} />
                    <Text style={styles.livePulseText}>HIGH-VOLTAGE POWER FLOWING</Text>
                  </View>
                  <Text style={styles.stationBadgeText}>{activeSession.stationCode}</Text>
                </View>

                <Text style={styles.sessionVehicleTitle}>{activeSession.vehicleNumber}</Text>
                <Text style={styles.sessionLocationText}>
                  Bay Location: {activeSession.stationId.toUpperCase()} · Assigned to Flat {activeSession.userFlat}
                </Text>

                {/* Battery SoC Progress Gauge */}
                <View style={styles.socGaugeContainer}>
                  <View style={styles.socHeader}>
                    <Text style={styles.socTitle}>Battery Charge Level (SoC)</Text>
                    <Text style={styles.socValueText}>
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#059669' }}>
                        {activeSession.currentSoCPercentage}%
                      </Text>{' '}
                      / {activeSession.targetSoCPercentage}% Target
                    </Text>
                  </View>
                  <View style={styles.socProgressBarBg}>
                    <View
                      style={[
                        styles.socProgressBarFill,
                        { width: `${activeSession.currentSoCPercentage}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.socFooterRow}>
                    <Text style={styles.socMetaText}>⏱️ {activeSession.estimatedEndTime}</Text>
                    <Text style={styles.socMetaText}>⚡ Tariff: ₹{activeSession.tariffRatePerKWh}/kWh</Text>
                  </View>
                </View>
              </View>

              {/* 4-Metric IoT Live Telemetry Grid */}
              <Text style={styles.telemetrySectionHeader}>Real-Time Grid Telemetry & Sensors</Text>
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryCard}>
                  <View style={[styles.telemetryIconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="speedometer-outline" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.telemetryValue}>{activeSession.powerOutputKW} kW</Text>
                  <Text style={styles.telemetryLabel}>Power Delivery</Text>
                </View>

                <View style={styles.telemetryCard}>
                  <View style={[styles.telemetryIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="flash-outline" size={18} color="#D97706" />
                  </View>
                  <Text style={styles.telemetryValue}>{activeSession.energyConsumedKWh} kWh</Text>
                  <Text style={styles.telemetryLabel}>Energy Consumed</Text>
                </View>

                <View style={styles.telemetryCard}>
                  <View style={[styles.telemetryIconWrap, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="cash-outline" size={18} color="#059669" />
                  </View>
                  <Text style={styles.telemetryValue}>₹{activeSession.currentCostINR.toFixed(2)}</Text>
                  <Text style={styles.telemetryLabel}>Accrued Cost</Text>
                </View>

                <View style={styles.telemetryCard}>
                  <View style={[styles.telemetryIconWrap, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="thermometer-outline" size={18} color="#DC2626" />
                  </View>
                  <Text style={styles.telemetryValue}>{activeSession.temperatureCelsius}°C</Text>
                  <Text style={styles.telemetryLabel}>Plug Temperature</Text>
                </View>
              </View>

              {/* Voltage / Current Diagnostics */}
              <View style={styles.diagnosticsBox}>
                <View style={styles.diagRow}>
                  <Text style={styles.diagLabel}>3-Phase Line Voltage:</Text>
                  <Text style={styles.diagVal}>{activeSession.voltageV} V AC (Stable)</Text>
                </View>
                <View style={styles.diagRow}>
                  <Text style={styles.diagLabel}>Current Draw:</Text>
                  <Text style={styles.diagVal}>{activeSession.currentA} Amperes</Text>
                </View>
                <View style={styles.diagRow}>
                  <Text style={styles.diagLabel}>Smart Grid Relay:</Text>
                  <Text style={[styles.diagVal, { color: '#059669' }]}>Active Load Balanced</Text>
                </View>
              </View>

              {/* Remote Emergency Stop Button */}
              <TouchableOpacity
                style={styles.stopChargingBtn}
                onPress={() => {
                  Alert.alert(
                    'Stop Charging Session',
                    'Disconnect high-voltage relay and finalize billing invoice for this session?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Stop & Disconnect',
                        style: 'destructive',
                        onPress: () => stopChargingMutation.mutate(activeSession.id),
                      },
                    ]
                  );
                }}
                activeOpacity={0.8}
                disabled={stopChargingMutation.isPending}
              >
                {stopChargingMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="stop-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.stopChargingBtnText}>Stop Charging & Generate Invoice</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="flash-off-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Active EV Session</Text>
              <Text style={styles.emptySubtitle}>
                Plug your EV into any available charging bay or start a session from the Charging Bays tab.
              </Text>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { marginTop: 16 }]}
                onPress={() => setActiveTab('STATIONS')}
              >
                <Text style={styles.primaryActionBtnText}>Browse Available Bays →</Text>
              </TouchableOpacity>
            </View>
          )
        ) : activeTab === 'STATIONS' ? (
          /* ── TAB 2: CHARGING BAYS BROWSER ──────────────────────── */
          <View>
            <View style={styles.baysHeaderBanner}>
              <Ionicons name="leaf" size={20} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.baysBannerTitle}>100% Green Solar Powered EV Hub</Text>
                <Text style={styles.baysBannerDesc}>
                  Basement EV chargers are backed by the Society Rooftop Solar Array with dynamic load balancing.
                </Text>
              </View>
            </View>

            {stations.map((st) => (
              <View key={st.id} style={styles.stationCard}>
                <View style={styles.stationCardHeader}>
                  <View style={styles.stationCodeRow}>
                    <View
                      style={[
                        styles.stationStatusPill,
                        st.status === 'AVAILABLE'
                          ? styles.statusAvailable
                          : st.status === 'CHARGING'
                          ? styles.statusCharging
                          : styles.statusBooked,
                      ]}
                    >
                      <Ionicons
                        name={
                          st.status === 'AVAILABLE'
                            ? 'checkmark-circle'
                            : st.status === 'CHARGING'
                            ? 'flash'
                            : 'calendar'
                        }
                        size={12}
                        color={
                          st.status === 'AVAILABLE'
                            ? '#059669'
                            : st.status === 'CHARGING'
                            ? '#D97706'
                            : '#2563EB'
                        }
                      />
                      <Text
                        style={[
                          styles.stationStatusText,
                          {
                            color:
                              st.status === 'AVAILABLE'
                                ? '#059669'
                                : st.status === 'CHARGING'
                                ? '#D97706'
                                : '#2563EB',
                          },
                        ]}
                      >
                        {st.status}
                      </Text>
                    </View>

                    <Text style={styles.tariffTagText}>₹{st.tariffPerKWh}/kWh</Text>
                  </View>

                  <Text style={styles.stationName}>{st.name}</Text>
                  <Text style={styles.stationLocation}>📍 {st.location}</Text>
                </View>

                {/* Specs Box */}
                <View style={styles.stationSpecsRow}>
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Connector</Text>
                    <Text style={styles.specVal}>{st.connectorType}</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Max Power</Text>
                    <Text style={styles.specVal}>{st.maxPowerKW} kW</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Level</Text>
                    <Text style={styles.specVal}>{st.level}</Text>
                  </View>
                </View>

                {st.notes && (
                  <View style={styles.stationNotesBox}>
                    <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                    <Text style={styles.stationNotesText}>{st.notes}</Text>
                  </View>
                )}

                {/* Station Action Footer */}
                <View style={styles.stationCardFooter}>
                  {st.status === 'AVAILABLE' ? (
                    <View style={styles.btnRow}>
                      <TouchableOpacity
                        style={styles.bookSlotBtn}
                        onPress={() => handleOpenBooking(st)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
                        <Text style={styles.bookSlotBtnText}>Reserve Slot</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.plugChargeBtn}
                        onPress={() =>
                          startChargingMutation.mutate({
                            stationId: st.id,
                            vehicle: 'KA-01-EV-9821 (Nexon EV)',
                          })
                        }
                        activeOpacity={0.8}
                        disabled={startChargingMutation.isPending}
                      >
                        <Ionicons name="flash" size={15} color="#FFFFFF" />
                        <Text style={styles.plugChargeBtnText}>Plug & Charge Now</Text>
                      </TouchableOpacity>
                    </View>
                  ) : st.status === 'CHARGING' ? (
                    <View style={styles.chargingActiveRow}>
                      <Text style={styles.inUseText}>
                        ⚡ Charging: {st.activeVehicleNumber} ({st.activeUserFlat})
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.chargingActiveRow}>
                      <Text style={styles.bookedText}>📅 Reserved for scheduled charging</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* ── TAB 3: CHARGING HISTORY & INVOICES ─────────────────── */
          <View>
            <View style={styles.co2SummaryCard}>
              <View style={styles.co2IconWrap}>
                <Ionicons name="planet" size={24} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.co2Title}>Green Society Impact</Text>
                <Text style={styles.co2Value}>63.4 kg CO₂ Emissions Avoided</Text>
                <Text style={styles.co2Desc}>
                  Equivalent to planting 3.2 trees across 3 charging sessions at Mana Community EV Grid.
                </Text>
              </View>
            </View>

            <Text style={styles.historySectionHeading}>Past Power Delivery & Invoices</Text>

            {history.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <View>
                    <Text style={styles.historyStationCode}>{item.stationCode}</Text>
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </View>
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                    <Text style={styles.paidBadgeText}>₹{item.totalCostINR.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.historyMetricsRow}>
                  <View style={styles.histMetric}>
                    <Text style={styles.histMetricLabel}>Energy Delivered</Text>
                    <Text style={styles.histMetricVal}>{item.energyDeliveredKWh} kWh</Text>
                  </View>
                  <View style={styles.histMetric}>
                    <Text style={styles.histMetricLabel}>Duration</Text>
                    <Text style={styles.histMetricVal}>{item.durationFormatted}</Text>
                  </View>
                  <View style={styles.histMetric}>
                    <Text style={styles.histMetricLabel}>CO₂ Offset</Text>
                    <Text style={[styles.histMetricVal, { color: '#059669' }]}>{item.co2SavedKg} kg</Text>
                  </View>
                </View>

                <View style={styles.historyFooter}>
                  <TouchableOpacity
                    style={styles.histActionBtn}
                    onPress={() =>
                      Alert.alert(
                        'Official Power Invoice',
                        `Downloading tax invoice for session ${item.id}...\nTariff: ₹8.50/kWh\nEnergy: ${item.energyDeliveredKWh} kWh`
                      )
                    }
                  >
                    <Ionicons name="download-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.histActionBtnText}>Download PDF Invoice</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.histActionBtn}
                    onPress={() => handleShareInvoice(item)}
                  >
                    <Ionicons name="share-social-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.histActionBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Slot Booking Modal ────────────────────────────────────── */}
      <Modal visible={bookingModalVisible} transparent animationType="slide" onRequestClose={() => setBookingModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reserve EV Charging Bay</Text>
                <Text style={styles.modalSubtitle}>{selectedStationForBooking?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Registered EV Vehicle</Text>
            <TextInput
              style={styles.input}
              value={bookVehicle}
              onChangeText={setBookVehicle}
            />

            <Text style={styles.inputLabel}>Reservation Start Time</Text>
            <TextInput
              style={styles.input}
              value={bookTime}
              onChangeText={setBookTime}
              placeholder="e.g. 06:00 PM"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Charging Duration (Hours)</Text>
            <View style={styles.durationRow}>
              {[1, 2, 3, 4].map((hrs) => (
                <TouchableOpacity
                  key={hrs}
                  style={[styles.durationChip, bookDurationHours === hrs && styles.durationChipActive]}
                  onPress={() => setBookDurationHours(hrs)}
                >
                  <Text style={[styles.durationChipText, bookDurationHours === hrs && styles.durationChipTextActive]}>
                    {hrs} Hr{hrs > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Target Battery Level (%)</Text>
            <TextInput
              style={styles.input}
              value={bookTargetSoC}
              onChangeText={setBookTargetSoC}
              keyboardType="number-pad"
            />

            {/* Estimated Tariff Box */}
            <View style={styles.estCostBox}>
              <Text style={styles.estCostLabel}>Estimated Power Consumption:</Text>
              <Text style={styles.estCostValue}>
                ~{(bookDurationHours * 15).toFixed(0)} kWh (Est. ₹{((bookDurationHours * 15) * 8.5).toFixed(0)})
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setBookingModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleConfirmBooking}
                disabled={bookStationMutation.isPending}
              >
                {bookStationMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>Confirm Reservation</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topTabBtnActive: {
    borderBottomColor: COLORS.primary,
  },
  topTabBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.textMuted,
  },
  topTabBtnTextActive: {
    color: COLORS.primary,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  sessionContainer: {
    marginBottom: SPACING.lg,
  },
  liveHeaderCard: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  livePulseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  livePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  livePulseText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  stationBadgeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'DMSans-Medium',
  },
  sessionVehicleTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  sessionLocationText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: SPACING.md,
  },
  socGaugeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  socHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  socTitle: {
    fontSize: 13,
    color: '#E2E8F0',
    fontFamily: 'DMSans-Medium',
  },
  socValueText: {
    fontSize: 13,
    color: '#E2E8F0',
  },
  socProgressBarBg: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  socProgressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  socFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  socMetaText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  telemetrySectionHeader: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.md,
  },
  telemetryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  telemetryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  telemetryValue: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  telemetryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  diagnosticsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.lg,
    gap: 6,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  diagLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  diagVal: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.text,
  },
  stopChargingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    gap: 8,
    ...SHADOWS.md,
  },
  stopChargingBtnText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 32,
    marginTop: 40,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  primaryActionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  baysHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: SPACING.md,
  },
  baysBannerTitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: '#065F46',
    marginBottom: 2,
  },
  baysBannerDesc: {
    fontSize: 11,
    color: '#065F46',
    lineHeight: 15,
  },
  stationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  stationCardHeader: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stationCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stationStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusAvailable: {
    backgroundColor: '#D1FAE5',
  },
  statusCharging: {
    backgroundColor: '#FEF3C7',
  },
  statusBooked: {
    backgroundColor: '#DBEAFE',
  },
  stationStatusText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
  },
  tariffTagText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#059669',
  },
  stationName: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  stationLocation: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  stationSpecsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  specItem: {
    flex: 1,
    alignItems: 'center',
  },
  specDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  specLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  specVal: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  stationNotesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  stationNotesText: {
    fontSize: 11,
    color: '#64748B',
  },
  stationCardFooter: {
    padding: SPACING.md,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bookSlotBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 4,
  },
  bookSlotBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.primary,
  },
  plugChargeBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: '#059669',
    gap: 4,
  },
  plugChargeBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  chargingActiveRow: {
    alignItems: 'center',
  },
  inUseText: {
    fontSize: 12,
    color: '#D97706',
    fontFamily: 'DMSans-Medium',
  },
  bookedText: {
    fontSize: 12,
    color: '#2563EB',
    fontFamily: 'DMSans-Medium',
  },
  co2SummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: SPACING.md,
  },
  co2IconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  co2Title: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#166534',
  },
  co2Value: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: '#166534',
    marginVertical: 2,
  },
  co2Desc: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
  },
  historySectionHeading: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyStationCode: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  paidBadgeText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#059669',
  },
  historyMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: RADIUS.sm,
    marginBottom: 8,
  },
  histMetric: {
    alignItems: 'center',
  },
  histMetricLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  histMetricVal: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  histActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  histActionBtnText: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: COLORS.primary,
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
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: '#F1F5F9',
  },
  durationChipActive: {
    backgroundColor: COLORS.primary,
  },
  durationChipText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.text,
  },
  durationChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  estCostBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  estCostLabel: {
    fontSize: 12,
    color: '#1E40AF',
  },
  estCostValue: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#1E40AF',
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
});
