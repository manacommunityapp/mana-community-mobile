import React, { useState, useCallback } from 'react';
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

type ParkingFilter = 'MY_SPOTS' | 'AVAILABLE' | 'ALL';

export default function ParkingHomeScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<ParkingFilter>('MY_SPOTS');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'Basement 1' | 'Basement 2'>('ALL');

  // Visitor pass modal state
  const [visitorModalVisible, setVisitorModalVisible] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorVehicle, setVisitorVehicle] = useState('');
  const [visitorType, setVisitorType] = useState<'CAR' | 'BIKE' | 'EV'>('CAR');
  const [visitorPurpose, setVisitorPurpose] = useState('Guest Visit');
  const [submittingPass, setSubmittingPass] = useState(false);

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

  const handleCreateVisitorPass = async () => {
    if (!visitorName.trim() || !visitorVehicle.trim()) {
      Alert.alert('Required Info', 'Please enter visitor name and vehicle license plate.');
      return;
    }
    setSubmittingPass(true);
    try {
      const pass = await parkingService.createVisitorPass({
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim(),
        vehicleNumber: visitorVehicle.trim().toUpperCase(),
        vehicleType: visitorType,
        purpose: visitorPurpose,
      });
      setVisitorModalVisible(false);
      refetchPasses();
      Alert.alert(
        '🎟️ Visitor Pass Issued',
        'Pass Code: ' + pass.passCode + '\nVehicle: ' + pass.vehicleNumber + '\n\nGate ANPR has been authorized for instant barrier lift.'
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not issue pass');
    } finally {
      setSubmittingPass(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goHome}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.topBarTitle}>Mana Parking OS</Text>
          <Text style={styles.topBarSubtitle}>Automated Smart Parking & Community Pool</Text>
        </View>
        <TouchableOpacity style={styles.anprBadge} onPress={() => router.push('/parking/anpr')}>
          <Ionicons name="camera" size={14} color="#10B981" />
          <Text style={styles.anprBadgeText}>ANPR Live</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={occLoading || spotsLoading} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Key Metrics Strip */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{occupancy?.occupancyPercentage || 85}%</Text>
            <Text style={styles.metricLabel}>Occupancy</Text>
            <Text style={styles.metricSub}>{occupancy?.availableSpots || 8} free spots</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#059669' }]}>{occupancy?.marketplaceSpotsAvailable || 3}</Text>
            <Text style={styles.metricLabel}>Marketplace Pool</Text>
            <Text style={styles.metricSub}>From neighbors</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#2563EB' }]}>{occupancy?.availableVisitorSpots || 6}</Text>
            <Text style={styles.metricLabel}>Visitor Bays</Text>
            <Text style={styles.metricSub}>Available now</Text>
          </View>
        </View>

        {/* Highlight Feature Banner: Temporary Parking Marketplace */}
        <TouchableOpacity style={styles.marketplaceBanner} onPress={() => router.push('/parking/marketplace')}>
          <View style={{ flex: 1 }}>
            <View style={styles.bannerTag}>
              <Ionicons name="sparkles" size={12} color="#D97706" />
              <Text style={styles.bannerTagText}>COMMUNITY MARKETPLACE</Text>
            </View>
            <Text style={styles.bannerTitle}>Going away? Rent your slot.</Text>
            <Text style={styles.bannerDesc}>
              Earn ₹80-₹150/day or lend for free in Good Neighbor mode. ANPR gate automatically syncs.
            </Text>
          </View>
          <View style={styles.bannerArrow}>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* 10 Submodules Quick Navigation Hub */}
        <Text style={styles.sectionHeader}>Parking OS Modules</Text>
        <View style={styles.moduleGrid}>
          <TouchableOpacity style={styles.moduleTile} onPress={() => router.push('/parking/marketplace')}>
            <View style={[styles.tileIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="swap-horizontal" size={22} color="#2563EB" />
            </View>
            <Text style={styles.tileTitle}>Marketplace</Text>
            <Text style={styles.tileSubtitle}>P2P Renting</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleTile} onPress={() => router.push('/parking/ev-charging')}>
            <View style={[styles.tileIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="flash" size={22} color="#059669" />
            </View>
            <Text style={styles.tileTitle}>EV Charging</Text>
            <Text style={styles.tileSubtitle}>Fast Telemetry</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleTile} onPress={() => router.push('/parking/anpr')}>
            <View style={[styles.tileIcon, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="videocam" size={22} color="#7C3AED" />
            </View>
            <Text style={styles.tileTitle}>ANPR Gates</Text>
            <Text style={styles.tileSubtitle}>Fastag Auto-Lift</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleTile} onPress={() => router.push('/parking/violations')}>
            <View style={[styles.tileIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="alert-circle" size={22} color="#DC2626" />
            </View>
            <Text style={styles.tileTitle}>Violations</Text>
            <Text style={styles.tileSubtitle}>Photo & Fines</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleTile} onPress={() => router.push('/parking/swaps-waitlist')}>
            <View style={[styles.tileIcon, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="people" size={22} color="#D97706" />
            </View>
            <Text style={styles.tileTitle}>Swaps & Queue</Text>
            <Text style={styles.tileSubtitle}>2nd Car Waitlist</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleTile} onPress={() => setVisitorModalVisible(true)}>
            <View style={[styles.tileIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="qr-code" size={22} color="#16A34A" />
            </View>
            <Text style={styles.tileTitle}>Visitor Pass</Text>
            <Text style={styles.tileSubtitle}>Quick Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'MY_SPOTS' && styles.filterBtnActive]}
            onPress={() => setFilter('MY_SPOTS')}
          >
            <Text style={[styles.filterBtnText, filter === 'MY_SPOTS' && styles.filterBtnTextActive]}>
              My Assigned Slots
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filter === 'ALL' && styles.filterBtnActive]}
            onPress={() => setFilter('ALL')}
          >
            <Text style={[styles.filterBtnText, filter === 'ALL' && styles.filterBtnTextActive]}>
              Basement Floor Plan
            </Text>
          </TouchableOpacity>
        </View>

        {/* Spot Cards */}
        {filteredSpots.map((spot) => (
          <View key={spot.id} style={styles.spotCard}>
            <View style={styles.spotCardHeader}>
              <View style={styles.spotNumberBox}>
                <Ionicons name={spot.type === 'EV' ? 'flash' : spot.type === 'BIKE' ? 'bicycle' : 'car'} size={16} color={COLORS.primary} />
                <Text style={styles.spotNumberText}>{spot.spotNumber}</Text>
              </View>
              <View style={[styles.statusBadge, spot.status === 'AVAILABLE' ? styles.statusAvail : styles.statusOcc]}>
                <Text style={[styles.statusBadgeText, spot.status === 'AVAILABLE' ? styles.statusAvailText : styles.statusOccText]}>
                  {spot.status}
                </Text>
              </View>
            </View>

            <Text style={styles.spotDetail}>📍 {spot.level} • {spot.type} Slot</Text>
            {spot.vehicleNumber && <Text style={styles.spotVehicle}>🚗 Assigned Vehicle: {spot.vehicleNumber}</Text>}
            {spot.ownerFlat && <Text style={styles.spotOwner}>Owner: {spot.ownerName} ({spot.ownerFlat})</Text>}

            {filter === 'MY_SPOTS' && (
              <View style={styles.mySpotActions}>
                <TouchableOpacity
                  style={styles.lendBtn}
                  onPress={() => router.push('/parking/marketplace')}
                >
                  <Ionicons name="share-social" size={14} color="#FFFFFF" />
                  <Text style={styles.lendBtnText}>List on Marketplace</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Visitor Pass Modal */}
      <Modal visible={visitorModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issue Visitor Parking Pass</Text>
              <TouchableOpacity onPress={() => setVisitorModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Visitor Name *</Text>
            <TextInput style={styles.input} value={visitorName} onChangeText={setVisitorName} placeholder="e.g. Ramesh Kumar" />

            <Text style={styles.inputLabel}>Visitor Vehicle Plate *</Text>
            <TextInput style={styles.input} value={visitorVehicle} onChangeText={setVisitorVehicle} placeholder="e.g. KA-05-MM-1234" autoCapitalize="characters" />

            <Text style={styles.inputLabel}>Purpose of Visit</Text>
            <TextInput style={styles.input} value={visitorPurpose} onChangeText={setVisitorPurpose} placeholder="e.g. Dinner / Guest" />

            <TouchableOpacity style={styles.confirmBtn} onPress={handleCreateVisitorPass} disabled={submittingPass}>
              {submittingPass ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmBtnText}>Issue Pass & Pre-Clear Gate</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  topBarTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  topBarSubtitle: { fontSize: 11, color: '#94A3B8' },
  anprBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  anprBadgeText: { fontSize: 11, color: '#34D399', fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  metricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  metricVal: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  metricLabel: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },
  metricSub: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  marketplaceBanner: {
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.md,
  },
  bannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  bannerTagText: { fontSize: 9, fontWeight: 'bold', color: '#B45309' },
  bannerTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  bannerDesc: { fontSize: 12, color: '#94A3B8', marginTop: 4, lineHeight: 16 },
  bannerArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sectionHeader: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  moduleTile: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  tileIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileTitle: { fontSize: 12, fontWeight: 'bold', color: '#0F172A', textAlign: 'center' },
  tileSubtitle: { fontSize: 10, color: '#64748B', marginTop: 2, textAlign: 'center' },
  filterBar: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  filterBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: '#E2E8F0' },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  filterBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  spotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  spotCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spotNumberBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spotNumberText: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  statusAvail: { backgroundColor: '#D1FAE5' },
  statusAvailText: { color: '#059669', fontSize: 11, fontWeight: 'bold' },
  statusOcc: { backgroundColor: '#EFF6FF' },
  statusOccText: { color: '#2563EB', fontSize: 11, fontWeight: 'bold' },
  spotDetail: { fontSize: 12, color: '#64748B', marginTop: 6 },
  spotVehicle: { fontSize: 12, fontWeight: '600', color: '#0F172A', marginTop: 2 },
  spotOwner: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  mySpotActions: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  lendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0F172A', paddingVertical: 8, borderRadius: RADIUS.md },
  lendBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginBottom: 12, backgroundColor: '#F8FAFC' },
  confirmBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 8 },
  confirmBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});
