import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { communityOpsService, ParcelLogDto } from '@/services/communityOpsService';

const STATUS_META: Record<ParcelLogDto['status'], { label: string; color: string }> = {
  RECEIVED:   { label: 'At Gate',    color: '#D97706' },
  NOTIFIED:   { label: 'Notified',   color: '#2563EB' },
  PICKED_UP:  { label: 'Picked Up',  color: '#059669' },
};

export default function ParcelsScreen() {
  const [parcels, setParcels] = useState<ParcelLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [otpTarget, setOtpTarget] = useState<ParcelLogDto | null>(null);
  const [otp, setOtp] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try { setParcels(await communityOpsService.getMyParcels()); } catch {}
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, []);

  const handleAcknowledge = async () => {
    if (!otpTarget || !otp.trim()) return;
    setAcknowledging(true);
    try {
      await communityOpsService.acknowledgeParcels(otpTarget.id, otp.trim());
      setOtpTarget(null);
      setOtp('');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Invalid OTP or failed to acknowledge');
    } finally { setAcknowledging(false); }
  };

  const renderParcel = ({ item }: { item: ParcelLogDto }) => {
    const meta = STATUS_META[item.status];
    const isPending = item.status !== 'PICKED_UP';
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="cube-outline" size={22} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            {item.senderName && <Text style={styles.sender}>{item.senderName}</Text>}
            {item.courierName && <Text style={styles.meta}>via {item.courierName}</Text>}
            {item.description && <Text style={styles.meta}>{item.description}</Text>}
            <Text style={styles.time}>Received: {new Date(item.receivedAt).toLocaleString()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${meta.color}18` }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        {isPending && (
          <TouchableOpacity style={styles.ackBtn} onPress={() => { setOtpTarget(item); setOtp(''); }}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.ackBtnText}>Acknowledge Pickup</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Parcels</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#D97706" />
      ) : (
        <FlatList
          data={parcels}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={<Text style={styles.empty}>No pending parcels.</Text>}
          renderItem={renderParcel}
        />
      )}

      {/* OTP modal */}
      <Modal visible={!!otpTarget} animationType="fade" transparent onRequestClose={() => setOtpTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.otpSheet}>
            <Text style={styles.otpTitle}>Confirm Pickup</Text>
            <Text style={styles.otpSub}>Enter the OTP sent to your registered number</Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <View style={styles.otpActions}>
              <TouchableOpacity style={styles.otpCancel} onPress={() => setOtpTarget(null)}>
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.otpConfirm, (acknowledging || !otp.trim()) && { opacity: 0.6 }]}
                onPress={handleAcknowledge}
                disabled={acknowledging || !otp.trim()}
              >
                {acknowledging ? <ActivityIndicator color="#fff" /> : <Text style={styles.otpConfirmText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 60, fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  sender: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  time: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  ackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#059669', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginTop: 12, alignSelf: 'flex-start' },
  ackBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  otpSheet: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 },
  otpTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  otpSub: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  otpInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', letterSpacing: 8 },
  otpActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  otpCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#F3F4F6' },
  otpCancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  otpConfirm: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#059669' },
  otpConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
