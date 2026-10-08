import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import {
  parkingService,
  ParkingViolationReportDto,
  ViolationType,
} from '@/services/parkingService';

export default function ParkingViolationsScreen() {
  const queryClient = useQueryClient();
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [spotNumber, setSpotNumber] = useState('B1-P12');
  const [level, setLevel] = useState('Basement 1');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [violationType, setViolationType] = useState<ViolationType>('WRONG_SLOT');
  const [remarks, setRemarks] = useState('');

  const { data: violations = [], isLoading } = useQuery<ParkingViolationReportDto[]>({
    queryKey: ['parkingViolations'],
    queryFn: parkingService.getViolations,
  });

  const reportMutation = useMutation({
    mutationFn: parkingService.reportViolation,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['parkingViolations'] });
      setReportModalVisible(false);
      Alert.alert(
        '🚨 Violation Recorded',
        'Notice issued to vehicle ' + res.offendingVehicleNumber + '. Guard desk alerted for inspection.'
      );
    },
  });

  const handleReport = () => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Required', 'Please enter offending vehicle license plate.');
      return;
    }
    reportMutation.mutate({
      spotNumber,
      level,
      offendingVehicleNumber: vehicleNumber.trim().toUpperCase(),
      violationType,
      remarks: remarks || 'Unauthorized vehicle in private slot.',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerTitle}>⚠️ Parking Violations & Fines</Text>
            <Text style={styles.headerSubtitle}>Photo-based enforcement & unauthorized slot disputes</Text>
          </View>
          <TouchableOpacity style={styles.reportBtn} onPress={() => setReportModalVisible(true)}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
            <Text style={styles.reportBtnText}>Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
        ) : violations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text style={styles.emptyTitle}>Zero Active Violations</Text>
            <Text style={styles.emptyDesc}>Basement and stilt parking are operating smoothly.</Text>
          </View>
        ) : (
          violations.map((v) => (
            <View key={v.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Ionicons name="warning" size={14} color="#DC2626" />
                  <Text style={styles.typeBadgeText}>{v.violationType.replace(/_/g, ' ')}</Text>
                </View>
                <View style={[styles.statusBadge, v.status === 'FINED' ? styles.finedBadge : styles.warnedBadge]}>
                  <Text style={[styles.statusText, v.status === 'FINED' ? styles.finedText : styles.warnedText]}>
                    {v.status} • ₹{v.fineAmountINR}
                  </Text>
                </View>
              </View>

              <Text style={styles.vehicleText}>🚗 Offending Vehicle: {v.offendingVehicleNumber}</Text>
              <Text style={styles.detailText}>📍 Spot {v.spotNumber} ({v.level}) • Reported by {v.reporterFlat}</Text>
              <Text style={styles.timeText}>🕒 {v.timestamp}</Text>
              {v.remarks && <Text style={styles.remarksText}>💬 "{v.remarks}"</Text>}
            </View>
          ))
        )}
      </ScrollView>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Parking Violation</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Spot & Level</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={spotNumber} onChangeText={setSpotNumber} />
              <TextInput style={[styles.input, { flex: 1 }]} value={level} onChangeText={setLevel} />
            </View>

            <Text style={styles.inputLabel}>Offending Vehicle Plate *</Text>
            <TextInput
              style={styles.input}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              placeholder="e.g. KA-02-XX-9876"
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Violation Type</Text>
            <View style={styles.typeOptionRow}>
              {(['WRONG_SLOT', 'UNAUTHORIZED_OCCUPATION', 'NON_EV_ON_CHARGER', 'BLOCKING_DRIVEWAY'] as ViolationType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, violationType === t && styles.typeChipActive]}
                  onPress={() => setViolationType(t)}
                >
                  <Text style={[styles.typeChipText, violationType === t && styles.typeChipTextActive]}>
                    {t.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notes / Evidence</Text>
            <TextInput
              style={[styles.input, { height: 60 }]}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Describe situation..."
              multiline
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleReport} disabled={reportMutation.isPending}>
              {reportMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Violation Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#0F172A', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  reportBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  content: { flex: 1, padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.md },
  typeBadgeText: { color: '#DC2626', fontSize: 11, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.md },
  warnedBadge: { backgroundColor: '#FEF3C7' },
  warnedText: { color: '#B45309', fontSize: 11, fontWeight: 'bold' },
  finedBadge: { backgroundColor: '#FEE2E2' },
  finedText: { color: '#B91C1C', fontSize: 11, fontWeight: 'bold' },
  statusText: {},
  vehicleText: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginTop: 8 },
  detailText: { fontSize: 12, color: '#475569', marginTop: 4 },
  timeText: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  remarksText: { fontSize: 12, color: '#334155', fontStyle: 'italic', marginTop: 6 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 30, alignItems: 'center', marginTop: 30 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginTop: 10 },
  emptyDesc: { fontSize: 13, color: '#64748B', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginBottom: 12, backgroundColor: '#F8FAFC' },
  typeOptionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md, backgroundColor: '#E2E8F0' },
  typeChipActive: { backgroundColor: '#DC2626' },
  typeChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  typeChipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#DC2626', paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});
