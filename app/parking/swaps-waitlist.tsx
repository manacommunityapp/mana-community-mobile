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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import {
  parkingService,
  ParkingWaitlistEntryDto,
  ParkingSlotSwapRequestDto,
} from '@/services/parkingService';

export default function SwapsWaitlistScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'SWAPS' | 'WAITLIST'>('SWAPS');

  // Swap Modal
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [targetSpot, setTargetSpot] = useState('B1-P05');
  const [targetLevel, setTargetLevel] = useState('Basement 1');
  const [targetFlat, setTargetFlat] = useState('Tower A1 - 102');
  const [swapReason, setSwapReason] = useState('Need slot closer to lift for senior family member.');

  // Waitlist Modal
  const [waitlistModalVisible, setWaitlistModalVisible] = useState(false);
  const [prefLevel, setPrefLevel] = useState('Basement 1');

  const { data: swaps = [] } = useQuery<ParkingSlotSwapRequestDto[]>({
    queryKey: ['parkingSwaps'],
    queryFn: parkingService.getSwapRequests,
  });

  const { data: waitlist = [] } = useQuery<ParkingWaitlistEntryDto[]>({
    queryKey: ['parkingWaitlist'],
    queryFn: parkingService.getWaitlist,
  });

  const swapMutation = useMutation({
    mutationFn: parkingService.createSwapRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingSwaps'] });
      setSwapModalVisible(false);
      Alert.alert('✅ Swap Proposal Sent', 'The neighbor has been notified. Admin sign-off will follow upon agreement.');
    },
  });

  const waitlistMutation = useMutation({
    mutationFn: parkingService.joinWaitlist,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['parkingWaitlist'] });
      setWaitlistModalVisible(false);
      Alert.alert('📋 Joined Waitlist', 'You are Position #' + res.queuePosition + ' for secondary slot allocation.');
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔄 Slot Swaps & 2nd Car Waitlist</Text>
        <Text style={styles.headerSubtitle}>Mutual transfers between neighbors and official society waitlist</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'SWAPS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('SWAPS')}
        >
          <Text style={[styles.tabText, activeTab === 'SWAPS' && styles.tabTextActive]}>Mutual Swaps</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'WAITLIST' && styles.tabBtnActive]}
          onPress={() => setActiveTab('WAITLIST')}
        >
          <Text style={[styles.tabText, activeTab === 'WAITLIST' && styles.tabTextActive]}>2nd Car Waitlist</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'SWAPS' && (
          <>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setSwapModalVisible(true)}>
              <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Propose Slot Swap with Neighbor</Text>
            </TouchableOpacity>

            {swaps.map((s) => (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.swapTitle}>{s.currentSpotNumber} ➔ {s.targetSpotNumber}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{s.status.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.subText}>Requester: {s.requesterName} ({s.requesterFlat})</Text>
                <Text style={styles.subText}>Target: {s.targetOwnerFlat}</Text>
                <Text style={styles.reasonText}>Reason: "{s.reason}"</Text>
              </View>
            ))}
          </>
        )}

        {activeTab === 'WAITLIST' && (
          <>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setWaitlistModalVisible(true)}>
              <Ionicons name="list" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Join Additional Slot Queue</Text>
            </TouchableOpacity>

            {waitlist.map((w) => (
              <View key={w.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.waitlistPos}>Position #{w.queuePosition}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{w.status}</Text>
                  </View>
                </View>
                <Text style={styles.subText}>Resident: {w.residentName}</Text>
                <Text style={styles.subText}>Preferred Level: {w.preferredLevel} • Vehicle: {w.vehicleType}</Text>
                <Text style={styles.timeText}>Queued Since: {w.requestDate}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Swap Modal */}
      <Modal visible={swapModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Propose Mutual Slot Swap</Text>
            <Text style={styles.modalSub}>Your Current Slot: B1-P12 (Basement 1)</Text>

            <Text style={styles.inputLabel}>Target Spot Number</Text>
            <TextInput style={styles.input} value={targetSpot} onChangeText={setTargetSpot} />

            <Text style={styles.inputLabel}>Target Neighbor Flat</Text>
            <TextInput style={styles.input} value={targetFlat} onChangeText={setTargetFlat} />

            <Text style={styles.inputLabel}>Reason for Swap</Text>
            <TextInput style={[styles.input, { height: 60 }]} value={swapReason} onChangeText={setSwapReason} multiline />

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => swapMutation.mutate({ targetSpotNumber: targetSpot, targetLevel, targetOwnerFlat: targetFlat, reason: swapReason })}
            >
              <Text style={styles.confirmBtnText}>Send Proposal to Neighbor</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Waitlist Modal */}
      <Modal visible={waitlistModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join 2nd Car Parking Waitlist</Text>
            <Text style={styles.modalSub}>Fair seniority queue for unallocated society slots</Text>

            <Text style={styles.inputLabel}>Preferred Level</Text>
            <TextInput style={styles.input} value={prefLevel} onChangeText={setPrefLevel} />

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => waitlistMutation.mutate({ vehicleType: 'CAR', preferredLevel: prefLevel })}
            >
              <Text style={styles.confirmBtnText}>Join Queue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#1E293B', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  actionBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: RADIUS.md, marginBottom: 16 },
  actionBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  swapTitle: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  waitlistPos: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  badge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.md },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },
  subText: { fontSize: 12, color: '#475569', marginTop: 4 },
  reasonText: { fontSize: 12, color: '#334155', fontStyle: 'italic', marginTop: 6 },
  timeText: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginBottom: 12, backgroundColor: '#F8FAFC' },
  confirmBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 8 },
  confirmBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});
