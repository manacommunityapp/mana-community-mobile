import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SHADOWS, FONTS } from '@/constants/config';
import { homeServicesService } from '@/services/homeServicesService';

interface SubscriptionModalProps {
  visible: boolean;
  initialType?: 'CAR_WASH' | 'IRONING' | 'MAID';
  onClose: () => void;
  onSuccess: () => void;
}

export function SubscriptionModal({
  visible,
  initialType = 'CAR_WASH',
  onClose,
  onSuccess,
}: SubscriptionModalProps) {
  const [type, setType] = useState<'CAR_WASH' | 'IRONING' | 'MAID'>(initialType);
  const [frequency, setFrequency] = useState<'DAILY' | 'ALTERNATE' | 'WEEKLY'>('DAILY');
  const [vehicleNumber, setVehicleNumber] = useState('KA-05-MM-1234');
  const [vehicleType, setVehicleType] = useState<'HATCHBACK' | 'SEDAN' | 'SUV'>('SEDAN');
  const [timeSlot, setTimeSlot] = useState('06:30 AM');
  const [flatNumber, setFlatNumber] = useState('A-204');
  const [submitting, setSubmitting] = useState(false);

  let price = 899;
  if (type === 'CAR_WASH') {
    const add = vehicleType === 'SUV' ? 300 : vehicleType === 'SEDAN' ? 150 : 0;
    price = (frequency === 'DAILY' ? 1050 : frequency === 'ALTERNATE' ? 750 : 450) + add;
  } else if (type === 'IRONING') {
    price = frequency === 'DAILY' ? 1199 : 799;
  } else if (type === 'MAID') {
    price = 3500;
  }

  const handleSubscribe = async () => {
    setSubmitting(true);
    try {
      await homeServicesService.bookWorker({
        workerId: 'worker-sub-1',
        category: type === 'CAR_WASH' ? 'VEHICLE_CLEANING' : type === 'IRONING' ? 'IRONING' : 'MAID',
        slotDate: new Date().toISOString().split('T')[0],
        timeSlot,
        requirementsNotes: `Subscription: ${type} | Flat: ${flatNumber} | Vehicle: ${vehicleNumber} | Freq: ${frequency} | Rate: ₹${price}/mo`,
      });
      Alert.alert(
        'Subscription Activated!',
        `Your monthly ${type.replace('_', ' ')} subscription for Flat ${flatNumber} has been activated at ₹${price}/month.`,
        [{ text: 'View Bookings', onPress: () => { onSuccess(); onClose(); } }]
      );
    } catch (err: any) {
      Alert.alert('Subscription Failed', err?.message || 'Could not process subscription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.modalAccent} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🔄 Doorstep Subscription</Text>
              <Text style={styles.sub}>Recurring services for your flat</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Text style={styles.sectionLabel}>🏷️ Select Service</Text>
            <View style={styles.typeRow}>
              {[
                { id: 'CAR_WASH', label: 'Car Wash', emoji: '🚗' },
                { id: 'IRONING', label: 'Steam Iron', emoji: '👔' },
                { id: 'MAID', label: 'House Maid', emoji: '🧹' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.typeBtn, type === item.id && styles.typeBtnActive]}
                  onPress={() => setType(item.id as any)}
                >
                  <Text style={styles.typeEmoji}>{item.emoji}</Text>
                  <Text style={[styles.typeText, type === item.id && styles.typeTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {type === 'CAR_WASH' && (
              <View style={styles.box}>
                <Text style={styles.boxTitle}>🚙 Vehicle Details</Text>
                <View style={styles.pillRow}>
                  {(['HATCHBACK', 'SEDAN', 'SUV'] as const).map((vt) => (
                    <TouchableOpacity
                      key={vt}
                      style={[styles.pill, vehicleType === vt && styles.pillActive]}
                      onPress={() => setVehicleType(vt)}
                    >
                      <Text style={[styles.pillText, vehicleType === vt && styles.pillTextActive]}>
                        {vt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Vehicle Reg No. (e.g. KA-05-MM-1234)"
                  placeholderTextColor="#94A3B8"
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                />
              </View>
            )}

            <Text style={styles.sectionLabel}>📅 Service Frequency</Text>
            <View style={styles.pillRow}>
              {[
                { id: 'DAILY', label: '📆 Daily (6 Days/Wk)' },
                { id: 'ALTERNATE', label: '🔄 Alternate Days' },
                { id: 'WEEKLY', label: '📋 Weekly Deep Clean' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.freqPill, frequency === f.id && styles.freqPillActive]}
                  onPress={() => setFrequency(f.id as any)}
                >
                  <Text style={[styles.freqPillText, frequency === f.id && styles.freqPillTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>🕐 Morning Slot</Text>
                <TextInput
                  style={styles.input}
                  value={timeSlot}
                  onChangeText={setTimeSlot}
                  placeholder="06:30 AM"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>🏠 Flat Number</Text>
                <TextInput
                  style={styles.input}
                  value={flatNumber}
                  onChangeText={setFlatNumber}
                  placeholder="A-204"
                />
              </View>
            </View>

            <View style={styles.priceCard}>
              <View>
                <Text style={styles.priceSub}>📊 Monthly Subscription</Text>
                <View style={styles.priceValRow}>
                  <Text style={styles.priceVal}>₹{price.toLocaleString()}</Text>
                  <Text style={styles.perMo}>/mo</Text>
                </View>
              </View>
              <View style={styles.guaranteeBadge}>
                <Text style={styles.guaranteeText}>🛡️ Replace Guarantee</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.subBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubscribe}
              disabled={submitting}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.subBtnGrad}
              >
                <Text style={styles.subBtnText}>✅ Activate Recurring Plan</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 24,
    overflow: 'hidden',
  },
  modalAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#4F46E5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: { fontSize: 17, fontFamily: FONTS.displayEB, color: '#0F172A' },
  sub: { fontSize: 11, fontFamily: FONTS.regular, color: '#64748B', marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { padding: 20, gap: 14 },
  sectionLabel: { fontSize: 12, fontFamily: FONTS.bold, color: '#334155' },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  typeBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  typeEmoji: { fontSize: 22, marginBottom: 4 },
  typeText: { fontSize: 11, fontFamily: FONTS.bold, color: '#64748B' },
  typeTextActive: { color: '#4F46E5' },

  box: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    gap: 10,
  },
  boxTitle: { fontSize: 12, fontFamily: FONTS.bold, color: '#475569' },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  pillActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  pillText: { fontSize: 11, fontFamily: FONTS.bold, color: '#475569' },
  pillTextActive: { color: '#FFFFFF' },

  freqPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    marginBottom: 6,
  },
  freqPillActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  freqPillText: { fontSize: 12, fontFamily: FONTS.medium, color: '#475569' },
  freqPillTextActive: { color: '#4F46E5', fontFamily: FONTS.bold },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#0F172A',
  },
  grid2: { flexDirection: 'row', gap: 10 },

  priceCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceSub: { fontSize: 10, fontFamily: FONTS.bold, color: '#C7D2FE', textTransform: 'uppercase' },
  priceValRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  priceVal: { fontSize: 24, fontFamily: FONTS.displayEB, color: '#FFFFFF' },
  perMo: { fontSize: 12, fontFamily: FONTS.medium, color: '#A5B4FC', marginLeft: 2 },
  guaranteeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  guaranteeText: { fontSize: 10, fontFamily: FONTS.bold, color: '#34D399' },

  subBtn: { marginTop: 4, borderRadius: 16, overflow: 'hidden' },
  subBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  subBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: FONTS.bold },
});
