import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  parkingService,
  ANPRLogDto,
  VehicleWhitelistDto,
} from '@/services/parkingService';

type ANPRTab = 'LOGS' | 'MY_LOGS' | 'WHITELIST' | 'OVERSTAY';
type DirectionFilter = 'ALL' | 'ENTRY' | 'EXIT';

export default function ANPRScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ANPRTab>('LOGS');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [addVehicleModalVisible, setAddVehicleModalVisible] = useState(false);

  // New Whitelist Vehicle Form State
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newType, setNewType] = useState<'CAR' | 'BIKE' | 'EV'>('CAR');

  // Queries
  const { data: anprLogs = [], isLoading: logsLoading, refetch: refetchLogs, isRefetching: isRefetchingLogs } = useQuery({
    queryKey: ['anprLogs', searchQuery, directionFilter],
    queryFn: () => parkingService.getANPRLogs(searchQuery, directionFilter),
  });

  const { data: whitelist = [], isLoading: wlLoading, refetch: refetchWhitelist } = useQuery({
    queryKey: ['vehicleWhitelist'],
    queryFn: parkingService.getVehicleWhitelist,
  });

  const isLoading = logsLoading || wlLoading;

  const onRefresh = () => {
    refetchLogs();
    refetchWhitelist();
  };

  // Mutations
  const addVehicleMutation = useMutation({
    mutationFn: (data: Partial<VehicleWhitelistDto>) => parkingService.addVehicleToWhitelist(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicleWhitelist'] });
      setAddVehicleModalVisible(false);
      setNewPlate('');
      setNewModel('');
      Alert.alert('Vehicle Registered', 'FASTag RFID and plate number linked with auto-barrier clearance.');
    },
  });

  const handleAddVehicle = () => {
    if (!newPlate.trim() || !newModel.trim()) {
      Alert.alert('Required Info', 'Please provide the vehicle plate number and model.');
      return;
    }
    addVehicleMutation.mutate({
      plateNumber: newPlate.trim().toUpperCase(),
      vehicleModel: newModel.trim(),
      vehicleType: newType,
    });
  };

  const filteredLogs = anprLogs.filter((log) => {
    if (activeTab === 'MY_LOGS') {
      return log.ownerName?.includes('You') || log.ownerFlat?.includes('A1-302') || log.ownerFlat?.includes('Tower A - 302');
    }
    if (activeTab === 'OVERSTAY') {
      return log.category === 'UNREGISTERED' || log.status === 'FLAGGED';
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* ── Top Tabs ──────────────────────────────────────────────── */}
      <View style={styles.topTabBar}>
        {(
          [
            { key: 'LOGS', label: 'Gate Live Feed' },
            { key: 'MY_LOGS', label: 'My Vehicles' },
            { key: 'WHITELIST', label: 'RFID Whitelist' },
            { key: 'OVERSTAY', label: 'Gate Flags' },
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
              <Text style={[styles.topTabBtnText, isActive && styles.topTabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Search & Filter Controls (When viewing logs) ──────────── */}
      {(activeTab === 'LOGS' || activeTab === 'MY_LOGS') && (
        <View style={styles.filterControlsWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search plate e.g. KA-01-AB-1234 or gate..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.directionFilterRow}>
            {(
              [
                { key: 'ALL', label: 'All Directions' },
                { key: 'ENTRY', label: '🟢 Entry Only' },
                { key: 'EXIT', label: '🔴 Exit Only' },
              ] as const
            ).map((dir) => {
              const isSel = directionFilter === dir.key;
              return (
                <TouchableOpacity
                  key={dir.key}
                  style={[styles.dirChip, isSel && styles.dirChipActive]}
                  onPress={() => setDirectionFilter(dir.key)}
                >
                  <Text style={[styles.dirChipText, isSel && styles.dirChipTextActive]}>
                    {dir.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetchingLogs} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : activeTab === 'WHITELIST' ? (
          /* ── TAB: VEHICLE WHITELIST & FASTag RFID ────────────────── */
          <View>
            <View style={styles.whitelistHeaderBanner}>
              <Ionicons name="shield-checkmark" size={22} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.wlBannerTitle}>Dual-Factor Automated Barrier Clearance</Text>
                <Text style={styles.wlBannerDesc}>
                  Registered resident vehicles are detected via ANPR camera OCR and matched with FASTag RFID sensors for sub-200ms barrier elevation.
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>My Registered Whitelist Vehicles</Text>
              <TouchableOpacity
                style={styles.addVehicleBtn}
                onPress={() => setAddVehicleModalVisible(true)}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addVehicleBtnText}>Add Vehicle</Text>
              </TouchableOpacity>
            </View>

            {whitelist.map((v) => (
              <View key={v.id} style={styles.wlCard}>
                <View style={styles.wlIconWrap}>
                  <Ionicons
                    name={v.vehicleType === 'EV' ? 'flash' : v.vehicleType === 'BIKE' ? 'bicycle' : 'car'}
                    size={22}
                    color={COLORS.primary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.wlPlateRow}>
                    <Text style={styles.wlPlateNumber}>{v.plateNumber}</Text>
                    <View style={styles.autoGateBadge}>
                      <Ionicons name="flash" size={10} color="#059669" />
                      <Text style={styles.autoGateText}>Auto-Gate Active</Text>
                    </View>
                  </View>

                  <Text style={styles.wlModelText}>{v.vehicleModel}</Text>

                  <View style={styles.wlTagRow}>
                    <Ionicons name="barcode-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.wlTagText}>FASTag RFID: {v.fastagRfidId}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="videocam-off-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Gate Logs Found</Text>
            <Text style={styles.emptySubtitle}>No ANPR gate recognition events found for this filter.</Text>
          </View>
        ) : (
          /* ── TAB: ANPR RECOGNITION LOG EVENT CARDS ──────────────── */
          filteredLogs.map((log) => {
            const isEntry = log.direction === 'ENTRY';
            const isFlagged = log.status === 'FLAGGED' || log.status === 'MANUAL_INTERVENTION';

            return (
              <View key={log.id} style={[styles.logCard, isFlagged && styles.logCardFlagged]}>
                <View style={styles.logCardHeader}>
                  <View style={styles.plateContainer}>
                    <View style={styles.indFlagCol}>
                      <Text style={styles.indText}>IND</Text>
                    </View>
                    <Text style={styles.plateText}>{log.plateNumber}</Text>
                  </View>

                  <View style={styles.logStatusCol}>
                    <View
                      style={[
                        styles.dirBadge,
                        isEntry ? styles.dirBadgeEntry : styles.dirBadgeExit,
                      ]}
                    >
                      <Ionicons
                        name={isEntry ? 'arrow-down-circle' : 'arrow-up-circle'}
                        size={12}
                        color={isEntry ? '#059669' : '#DC2626'}
                      />
                      <Text
                        style={[
                          styles.dirBadgeText,
                          { color: isEntry ? '#059669' : '#DC2626' },
                        ]}
                      >
                        {log.direction}
                      </Text>
                    </View>
                    <Text style={styles.ocrConfidenceText}>OCR {log.ocrConfidence}%</Text>
                  </View>
                </View>

                {/* Gate and Timestamp Metadata */}
                <View style={styles.logBody}>
                  <View style={styles.gateRow}>
                    <Ionicons name="business" size={14} color={COLORS.primary} />
                    <Text style={styles.gateName}>{log.gateName}</Text>
                    <Text style={styles.logDot}>·</Text>
                    <Text style={styles.timestampText}>{log.timestamp}</Text>
                  </View>

                  {log.ownerName && (
                    <View style={styles.ownerRow}>
                      <Ionicons name="person-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.ownerText}>
                        {log.ownerName} {log.ownerFlat ? `(${log.ownerFlat})` : ''}
                      </Text>
                    </View>
                  )}

                  {log.notes && (
                    <View style={styles.notesRow}>
                      <Ionicons
                        name={isFlagged ? 'warning-outline' : 'shield-checkmark-outline'}
                        size={13}
                        color={isFlagged ? '#D97706' : '#059669'}
                      />
                      <Text style={[styles.notesText, isFlagged && { color: '#92400E' }]}>
                        {log.notes}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Footer Latency / Verification */}
                <View style={styles.logFooter}>
                  <Text style={styles.latencyText}>
                    ⚡ Boom Barrier Response: {log.barrierLatencyMs > 0 ? `${log.barrierLatencyMs}ms` : 'Manual Open'}
                  </Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{log.category}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Add Vehicle to Whitelist Modal ────────────────────────── */}
      <Modal visible={addVehicleModalVisible} transparent animationType="slide" onRequestClose={() => setAddVehicleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Register Vehicle to Whitelist</Text>
                <Text style={styles.modalSubtitle}>Link vehicle for automatic gate access</Text>
              </View>
              <TouchableOpacity onPress={() => setAddVehicleModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>License Plate Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. KA-01-MJ-9922"
              placeholderTextColor="#9CA3AF"
              value={newPlate}
              onChangeText={setNewPlate}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Vehicle Make & Model *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Hyundai Creta (Silver)"
              placeholderTextColor="#9CA3AF"
              value={newModel}
              onChangeText={setNewModel}
            />

            <Text style={styles.inputLabel}>Vehicle Category</Text>
            <View style={styles.typeSelectorRow}>
              {(
                [
                  { key: 'CAR', label: '4-Wheeler Car' },
                  { key: 'BIKE', label: '2-Wheeler' },
                  { key: 'EV', label: 'Electric EV' },
                ] as const
              ).map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeOption, newType === t.key && styles.typeOptionActive]}
                  onPress={() => setNewType(t.key)}
                >
                  <Text style={[styles.typeOptionText, newType === t.key && styles.typeOptionTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setAddVehicleModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleAddVehicle}
                disabled={addVehicleMutation.isPending}
              >
                {addVehicleMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>Register & Whitelist</Text>
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
    paddingVertical: 12,
    alignItems: 'center',
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
  filterControlsWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  directionFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dirChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dirChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dirChipText: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: COLORS.textSecondary,
  },
  dirChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
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
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  logCardFlagged: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1E293B',
    borderRadius: 6,
    overflow: 'hidden',
  },
  indFlagCol: {
    backgroundColor: '#003399',
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  plateText: {
    paddingHorizontal: 8,
    fontSize: 14,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    color: '#1E293B',
    letterSpacing: 1,
  },
  logStatusCol: {
    alignItems: 'flex-end',
  },
  dirBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  dirBadgeEntry: {
    backgroundColor: '#ECFDF5',
  },
  dirBadgeExit: {
    backgroundColor: '#FEE2E2',
  },
  dirBadgeText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
  },
  ocrConfidenceText: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  logBody: {
    padding: 12,
    gap: 4,
  },
  gateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gateName: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  logDot: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  timestampText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  ownerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'DMSans-Medium',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: RADIUS.sm,
  },
  notesText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  latencyText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'DMSans-Medium',
  },
  categoryBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: '#475569',
  },
  whitelistHeaderBanner: {
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
  wlBannerTitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: '#065F46',
    marginBottom: 2,
  },
  wlBannerDesc: {
    fontSize: 11,
    color: '#065F46',
    lineHeight: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  addVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  addVehicleBtnText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  wlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    ...SHADOWS.sm,
  },
  wlIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wlPlateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  wlPlateNumber: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  autoGateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  autoGateText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: '#059669',
  },
  wlModelText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  wlTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wlTagText: {
    fontSize: 11,
    color: COLORS.textMuted,
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
});
