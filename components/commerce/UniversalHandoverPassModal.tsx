import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/config';
import { CommerceHandoverPassDto } from '@/types/commerceCore';

interface UniversalHandoverPassModalProps {
  visible: boolean;
  onClose: () => void;
  orderNumber: string;
  handoverPass?: CommerceHandoverPassDto;
}

export const UniversalHandoverPassModal: React.FC<UniversalHandoverPassModalProps> = ({
  visible,
  onClose,
  orderNumber,
  handoverPass,
}) => {
  const pin = handoverPass?.verificationPin || '8421';
  const location = handoverPass?.pickupLocation || 'Clubhouse Gate 2 Handover Hub';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
              <Text style={styles.title}>Universal Handover Pass</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.orderLabel}>Order: #{orderNumber}</Text>

          {/* QR Code Container Mock */}
          <View style={styles.qrBox}>
            <Ionicons name="qr-code-outline" size={140} color={COLORS.primary} />
            <Text style={styles.qrPrompt}>Scan at Gate / Seller Pickup Desk</Text>
          </View>

          {/* 4-digit PIN */}
          <View style={styles.pinSection}>
            <Text style={styles.pinSub}>Or share 4-Digit Pickup PIN</Text>
            <View style={styles.pinDisplay}>
              {pin.split('').map((digit, idx) => (
                <View key={idx} style={styles.pinBox}>
                  <Text style={styles.pinDigit}>{digit}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Pickup Details */}
          <View style={styles.locationCard}>
            <Ionicons name="location-outline" size={18} color="#059669" />
            <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
              <Text style={styles.locationTitle}>Pickup Location</Text>
              <Text style={styles.locationText}>{location}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.xs,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  orderLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: SPACING.md,
  },
  qrBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  qrPrompt: {
    fontSize: 12,
    color: '#64748B',
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  pinSection: {
    marginVertical: SPACING.md,
    alignItems: 'center',
  },
  pinSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: SPACING.xs,
  },
  pinDisplay: {
    flexDirection: 'row',
    gap: 8,
  },
  pinBox: {
    width: 44,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  pinDigit: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  locationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  locationText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '500',
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});