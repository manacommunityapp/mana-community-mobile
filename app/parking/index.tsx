import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ScrollView, BackHandler, Modal,
  TextInput, Alert, RefreshControl, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import {
  parkingService,
  ParkingSpotDto,
  VisitorPassDto,
} from '@/services/parkingService';

type ParkingFilter = 'MY_SPOTS' | 'AVAILABLE' | 'ALL' | 'VISITOR_PASS';

const TYPE_ICON: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  CAR:  { icon: 'car',            color: '#2563EB', bg: '#DBEAFE' },
  BIKE: { icon: 'bicycle',        color: '#7C3AED', bg: '#EDE9FE' },
  EV:   { icon: 'flash',          color: '#059669', bg: '#D1FAE5' },
};

export default function ParkingScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<ParkingFilter>('MY_SPOTS');
  const [spots, setSpots] = useState<ParkingSpotDto[]>([]);
  const [visitorPasses, setVisitorPasses] = useState<VisitorPassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reserve modal state
  const [reserveModalVisible, setReserveModalVisible] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotDto | null>(null);
  const [reserveVehicle, setReserveVehicle] = useState('');
  const [reserveType, setReserveType] = useState<'CAR' | 'BIKE' | 'EV'>('CAR');
  const [reserveNotes, setReserveNotes] = useState('');
  const [submittingReserve, setSubmittingReserve] = useState(false);

  // Visitor pass modal state
  const [visitorModalVisible, setVisitorModalVisible] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorVehicle, setVisitorVehicle] = useState('');
  const [visitorType, setVisitorType] = useState<'CAR' | 'BIKE' | 'EV'>('CAR');
  const [visitorDurationHours, setVisitorDurationHours] = useState(8);
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
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { goHome(); return true; });
      return () => sub.remove();
    }, [goHome])
  );

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [spotsData, passesData] = await Promise.all([
        parkingService.getSpots(),
        parkingService.getVisitorPasses(),
      ]);
      if (Array.isArray(spotsData)) {
        setSpots(spotsData);
      }
      if (Array.isArray(passesData)) {
        setVisitorPasses(passesData);
      }
    } catch {
      // Gracefully handled inside hybrid parkingService
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Open Reserve Modal
  const openReserveModal = (spot: ParkingSpotDto) => {
    setSelectedSpot(spot);
    setReserveType((spot.type as 'CAR' | 'BIKE' | 'EV') || 'CAR');
    setReserveVehicle('');
    setReserveNotes('');
    setReserveModalVisible(true);
  };

  // Submit Spot Reservation
  const handleConfirmReservation = async () => {
    if (!selectedSpot) return;
    if (!reserveVehicle.trim()) {
      Alert.alert('Required', 'Please enter your vehicle number.');
      return;
    }

    setSubmittingReserve(true);
    try {
      const updated = await parkingService.reserveSpot({
        spotId: selectedSpot.id,
        vehicleNumber: reserveVehicle.trim().toUpperCase(),
        vehicleType: reserveType,
        notes: reserveNotes.trim() || undefined,
      });

      setSpots(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      setReserveModalVisible(false);
      Alert.alert('Spot Reserved', `Parking spot ${updated.spotNumber} has been reserved for ${updated.vehicleNumber}.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Unable to reserve spot. Please try again.';
      Alert.alert('Reservation Failed', msg);
    } finally {
      setSubmittingReserve(false);
    }
  };

  // Submit Visitor Pass
  const handleCreateVisitorPass = async () => {
    if (!visitorName.trim()) {
      Alert.alert('Required', 'Please enter the visitor\'s name.');
      return;
    }
    if (!visitorVehicle.trim()) {
      Alert.alert('Required', 'Please enter the vehicle number.');
      return;
    }

    setSubmittingPass(true);
    try {
      const now = new Date();
      const validUntil = new Date(now.getTime() + visitorDurationHours * 60 * 60 * 1000);

      const pass = await parkingService.createVisitorPass({
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim() || undefined,
        vehicleNumber: visitorVehicle.trim().toUpperCase(),
        vehicleType: visitorType,
        validFrom: now.toISOString(),
        validUntil: validUntil.toISOString(),
        purpose: visitorPurpose.trim() || 'Guest Visit',
      });

      setVisitorPasses(prev => [pass, ...prev]);
      setGeneratedPass(pass);
      setVisitorModalVisible(false);
      setPassSuccessModalVisible(true);

      // Reset form
      setVisitorName('');
      setVisitorPhone('');
      setVisitorVehicle('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Unable to generate pass. Please try again.';
      Alert.alert('Pass Creation Failed', msg);
    } finally {
      setSubmittingPass(false);
    }
  };

  // Share generated pass
  const handleSharePass = async (pass: VisitorPassDto) => {
    try {
      await Share.share({
        message: `Mana Community Visitor Parking Pass\nPass Code: ${pass.passCode}\nVisitor: ${pass.visitorName}\nVehicle: ${pass.vehicleNumber}\nValid Until: ${new Date(pass.validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\nShow this code at the security gate upon arrival.`,
      });
    } catch {}
  };

  // Filter spots
  const filteredSpots = spots.filter(s => {
    if (filter === 'MY_SPOTS') {
      return s.ownerName === 'You' || s.status === 'OCCUPIED' && s.ownerName?.toLowerCase().includes('you');
    }
    if (filter === 'AVAILABLE') {
      return s.status === 'AVAILABLE';
    }
    if (filter === 'ALL') {
      return true;
    }
    return false;
  });

  const renderSpotItem = ({ item }: { item: ParkingSpotDto }) => {
    const meta = TYPE_ICON[item.type] || TYPE_ICON.CAR;
    const isAvailable = item.status === 'AVAILABLE';

    return (
      <View style={st.spotCard}>
        <View style={[st.spotIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>

        <View style={st.spotInfo}>
          <View style={st.spotHeaderRow}>
            <Text style={st.spotNumber}>{item.spotNumber}</Text>
            <View style={[
              st.statusPill,
              item.status === 'AVAILABLE' ? { backgroundColor: '#D1FAE5' } :
              item.status === 'RESERVED' ? { backgroundColor: '#FEF3C7' } :
              { backgroundColor: COLORS.surfaceAlt },
            ]}>
              <Text style={[
                st.statusPillText,
                item.status === 'AVAILABLE' ? { color: '#059669' } :
                item.status === 'RESERVED' ? { color: '#D97706' } :
                { color: COLORS.textMuted },
              ]}>
                {item.status === 'OCCUPIED' ? 'In Use' : item.status === 'AVAILABLE' ? 'Free' : 'Reserved'}
              </Text>
            </View>
          </View>

          <Text style={st.spotLevel}>{item.level} • {item.type}</Text>

          {item.vehicleNumber && (
            <View style={st.vehicleRow}>
              <Ionicons name="car-outline" size={13} color={COLORS.textMuted} />
              <Text style={st.vehicleText}>{item.vehicleNumber}</Text>
            </View>
          )}

          {item.ownerName && (
            <Text style={st.ownerText}>
              Assigned: {item.ownerName} {item.ownerFlat ? `(${item.ownerFlat})` : ''}
            </Text>
          )}

          {isAvailable && (
            <TouchableOpacity
              style={st.reserveBtn}
              onPress={() => openReserveModal(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="bookmark-outline" size={14} color="#FFFFFF" />
              <Text style={st.reserveBtnText}>Reserve Spot</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderVisitorPassItem = ({ item }: { item: VisitorPassDto }) => {
    return (
      <View style={st.passCard}>
        <View style={st.passHeader}>
          <View style={st.passCodeContainer}>
            <Ionicons name="ticket" size={16} color={COLORS.primary} />
            <Text style={st.passCodeText}>{item.passCode}</Text>
          </View>
          <View style={st.passStatusBadge}>
            <Text style={st.passStatusText}>{item.status}</Text>
          </View>
        </View>

        <View style={st.passBody}>
          <Text style={st.passVisitorName}>{item.visitorName}</Text>
          <Text style={st.passVehicle}>{item.vehicleNumber} ({item.vehicleType})</Text>
          {item.purpose && <Text style={st.passPurpose}>{item.purpose}</Text>}
          <Text style={st.passValidity}>
            Valid until: {new Date(item.validUntil).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
          </Text>
        </View>

        <TouchableOpacity
          style={st.sharePassBtn}
          onPress={() => handleSharePass(item)}
          hitSlop={6}
        >
          <Ionicons name="share-social-outline" size={15} color={COLORS.primary} />
          <Text style={st.sharePassText}>Share Pass</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────── */}
      <View style={st.header}>
        <TouchableOpacity onPress={goHome} style={st.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Parking</Text>
          <Text style={st.headerSub}>Manage your spots & visitor passes</Text>
        </View>
        <TouchableOpacity
          style={st.headerActionBtn}
          onPress={() => setVisitorModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={st.headerActionText}>Pass</Text>
        </TouchableOpacity>
      </View>

      {/* ── Filters ───────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.filterRow}
        style={st.filterScroll}
      >
        {([
          { key: 'MY_SPOTS' as ParkingFilter, label: 'My Spots', icon: 'key-outline' as const },
          { key: 'AVAILABLE' as ParkingFilter, label: 'Available', icon: 'checkmark-circle-outline' as const },
          { key: 'ALL' as ParkingFilter, label: 'All Spots', icon: 'grid-outline' as const },
          { key: 'VISITOR_PASS' as ParkingFilter, label: 'Visitor Passes', icon: 'ticket-outline' as const },
        ]).map(f => (
          <TouchableOpacity
            key={f.key}
            style={[st.filterChip, filter === f.key && st.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Ionicons name={f.icon} size={14} color={filter === f.key ? '#fff' : COLORS.textMuted} />
            <Text style={[st.filterText, filter === f.key && st.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Content ───────────────────────────────────────────── */}
      {loading && !refreshing ? (
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={st.loadingText}>Loading parking spots...</Text>
        </View>
      ) : filter === 'VISITOR_PASS' ? (
        <FlatList
          data={visitorPasses}
          keyExtractor={item => String(item.id || item.passCode)}
          renderItem={renderVisitorPassItem}
          contentContainerStyle={st.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={st.empty}>
              <Ionicons name="ticket-outline" size={48} color={COLORS.textMuted} />
              <Text style={st.emptyTitle}>No Visitor Passes</Text>
              <Text style={st.emptyDesc}>Generate a temporary visitor parking pass for your upcoming guests.</Text>
              <TouchableOpacity
                style={st.emptyActionBtn}
                onPress={() => setVisitorModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={st.emptyActionBtnText}>Generate Pass</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredSpots}
          keyExtractor={item => String(item.id)}
          renderItem={renderSpotItem}
          contentContainerStyle={st.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={st.empty}>
              <Ionicons name="car-outline" size={48} color={COLORS.textMuted} />
              <Text style={st.emptyTitle}>No spots to show</Text>
              <Text style={st.emptyDesc}>
                {filter === 'MY_SPOTS' ? 'You have no assigned parking spots.' : 'No spots matching this filter.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Reserve Spot Modal ─────────────────────────────────── */}
      <Modal
        visible={reserveModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReserveModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <View style={st.modalSheet}>
            <View style={st.modalHeader}>
              <View>
                <Text style={st.modalTitle}>Reserve Spot {selectedSpot?.spotNumber}</Text>
                <Text style={st.modalSubtitle}>{selectedSpot?.level} • {selectedSpot?.type}</Text>
              </View>
              <TouchableOpacity onPress={() => setReserveModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={st.inputLabel}>Vehicle Number *</Text>
            <TextInput
              style={st.input}
              placeholder="e.g. KA-05-XY-9999"
              placeholderTextColor={COLORS.textMuted}
              value={reserveVehicle}
              onChangeText={setReserveVehicle}
              autoCapitalize="characters"
            />

            <Text style={st.inputLabel}>Vehicle Type</Text>
            <View style={st.typeSelectRow}>
              {(['CAR', 'BIKE', 'EV'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[st.typeBtn, reserveType === t && st.typeBtnActive]}
                  onPress={() => setReserveType(t)}
                >
                  <Text style={[st.typeBtnText, reserveType === t && st.typeBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[st.input, { height: 60 }]}
              placeholder="Resident vehicle or visitor slot"
              placeholderTextColor={COLORS.textMuted}
              value={reserveNotes}
              onChangeText={setReserveNotes}
              multiline
            />

            <View style={st.modalActionRow}>
              <TouchableOpacity
                style={st.cancelBtn}
                onPress={() => setReserveModalVisible(false)}
                disabled={submittingReserve}
              >
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={st.confirmBtn}
                onPress={handleConfirmReservation}
                disabled={submittingReserve}
              >
                {submittingReserve ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={st.confirmBtnText}>Confirm Reserve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Visitor Pass Modal ─────────────────────────────────── */}
      <Modal
        visible={visitorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisitorModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <View style={st.modalSheet}>
            <View style={st.modalHeader}>
              <View>
                <Text style={st.modalTitle}>Visitor Parking Pass</Text>
                <Text style={st.modalSubtitle}>Issue a temporary pass for guests</Text>
              </View>
              <TouchableOpacity onPress={() => setVisitorModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={st.inputLabel}>Visitor Name *</Text>
            <TextInput
              style={st.input}
              placeholder="e.g. Suresh Verma"
              placeholderTextColor={COLORS.textMuted}
              value={visitorName}
              onChangeText={setVisitorName}
            />

            <Text style={st.inputLabel}>Vehicle Number *</Text>
            <TextInput
              style={st.input}
              placeholder="e.g. KA-01-MJ-9821"
              placeholderTextColor={COLORS.textMuted}
              value={visitorVehicle}
              onChangeText={setVisitorVehicle}
              autoCapitalize="characters"
            />

            <Text style={st.inputLabel}>Vehicle Type</Text>
            <View style={st.typeSelectRow}>
              {(['CAR', 'BIKE', 'EV'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[st.typeBtn, visitorType === t && st.typeBtnActive]}
                  onPress={() => setVisitorType(t)}
                >
                  <Text style={[st.typeBtnText, visitorType === t && st.typeBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.inputLabel}>Duration</Text>
            <View style={st.typeSelectRow}>
              {[4, 8, 24].map(hours => (
                <TouchableOpacity
                  key={hours}
                  style={[st.typeBtn, visitorDurationHours === hours && st.typeBtnActive]}
                  onPress={() => setVisitorDurationHours(hours)}
                >
                  <Text style={[st.typeBtnText, visitorDurationHours === hours && st.typeBtnTextActive]}>
                    {hours} Hours
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={st.inputLabel}>Purpose</Text>
            <TextInput
              style={st.input}
              placeholder="e.g. Family Dinner / Guest"
              placeholderTextColor={COLORS.textMuted}
              value={visitorPurpose}
              onChangeText={setVisitorPurpose}
            />

            <View style={st.modalActionRow}>
              <TouchableOpacity
                style={st.cancelBtn}
                onPress={() => setVisitorModalVisible(false)}
                disabled={submittingPass}
              >
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={st.confirmBtn}
                onPress={handleCreateVisitorPass}
                disabled={submittingPass}
              >
                {submittingPass ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={st.confirmBtnText}>Issue Pass</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Pass Issued Success Modal ──────────────────────────── */}
      <Modal
        visible={passSuccessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPassSuccessModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <View style={[st.modalSheet, { alignItems: 'center', paddingVertical: 24 }]}>
            <View style={st.successIconCircle}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            </View>
            <Text style={st.successTitle}>Pass Issued Successfully!</Text>
            <Text style={st.successDesc}>Share this code with your guest to present at the gate:</Text>

            <View style={st.passDisplayBox}>
              <Text style={st.passDisplayCode}>{generatedPass?.passCode}</Text>
            </View>

            <Text style={st.passMetaText}>Visitor: {generatedPass?.visitorName}</Text>
            <Text style={st.passMetaText}>Vehicle: {generatedPass?.vehicleNumber}</Text>

            <View style={[st.modalActionRow, { marginTop: 20 }]}>
              <TouchableOpacity
                style={st.shareBtnLarge}
                onPress={() => generatedPass && handleSharePass(generatedPass)}
              >
                <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                <Text style={st.shareBtnLargeText}>Share Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={st.doneBtn}
                onPress={() => setPassSuccessModalVisible(false)}
              >
                <Text style={st.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  headerActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  headerActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  filterScroll: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 12, gap: 10 },
  loadingBox: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: COLORS.textMuted, fontSize: 13 },
  spotCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  spotIcon: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  spotInfo: { flex: 1, gap: 4 },
  spotHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spotNumber: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  spotLevel: { fontSize: 12, color: COLORS.textMuted },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  vehicleText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  ownerText: { fontSize: 11, color: COLORS.textMuted },
  statusPill: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  reserveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start', marginTop: 6,
  },
  reserveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  passCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm, gap: 8,
  },
  passHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passCodeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  passCodeText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  passStatusBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
  passStatusText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  passBody: { gap: 2 },
  passVisitorName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  passVehicle: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  passPurpose: { fontSize: 12, color: COLORS.textMuted },
  passValidity: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  sharePassBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primaryLight, paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: RADIUS.md, alignSelf: 'flex-start', marginTop: 4,
  },
  sharePassText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  emptyActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 16, paddingVertical: 10, marginTop: 16,
  },
  emptyActionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.surfaceAlt,
  },
  typeSelectRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  typeBtnTextActive: { color: '#FFFFFF' },
  modalActionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  confirmBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  successIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  successTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  successDesc: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: 16 },
  passDisplayBox: {
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: RADIUS.lg, marginVertical: 16, borderWidth: 1, borderColor: COLORS.primaryMid,
  },
  passDisplayCode: { fontSize: 24, fontWeight: '900', color: COLORS.primary, letterSpacing: 2 },
  passMetaText: { fontSize: 13, color: COLORS.textMuted, marginVertical: 1 },
  shareBtnLarge: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.md,
  },
  shareBtnLargeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  doneBtn: {
    paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
  },
  doneBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
});
